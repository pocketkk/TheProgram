"""
The Game Crafter Print Service

Integrates with The Game Crafter API to print custom tarot decks.
Handles authentication, file uploads, deck creation, and order management.
"""
import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List, Callable, Awaitable
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)


# TGC API Base URL
TGC_API_BASE = "https://www.thegamecrafter.com/api"

# Rate limit: 240 requests per minute (4 per second)
RATE_LIMIT_DELAY = 0.25  # 250ms between requests to stay safe


@dataclass
class TGCSession:
    """Active TGC session with user info"""
    session_id: str
    user_id: str
    username: str
    root_folder_id: str


@dataclass
class TGCUploadResult:
    """Result from file upload"""
    success: bool
    file_id: str = ""
    error: Optional[str] = None


@dataclass
class TGCDeckResult:
    """Result from deck creation"""
    success: bool
    game_id: str = ""
    deck_id: str = ""
    game_url: str = ""
    checkout_url: str = ""
    error: Optional[str] = None


@dataclass
class TGCPrintSubmission:
    """Full print submission result"""
    success: bool
    game_id: str = ""
    deck_id: str = ""
    game_url: str = ""
    checkout_url: str = ""
    cards_uploaded: int = 0
    error: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)


class GameCrafterService:
    """
    Service for interacting with The Game Crafter API

    Workflow for printing a tarot deck:
    1. Authenticate and get session
    2. Create a folder for deck images
    3. Upload card images (78 faces + 1 back)
    4. Get or create a Designer
    5. Create a Game
    6. Create a TarotDeck with cards
    7. Generate checkout URL

    Usage:
        service = GameCrafterService(api_key_id, username, password)
        session = await service.authenticate()
        result = await service.create_tarot_deck(
            collection_id="...",
            deck_name="My Custom Tarot",
            card_images=[...],
            card_back_image=...,
        )
        # Redirect user to result.checkout_url
    """

    def __init__(
        self,
        api_key_id: str,
        username: str,
        password: str,
    ):
        """
        Initialize the Game Crafter service

        Args:
            api_key_id: TGC API Key ID
            username: TGC account username
            password: TGC account password
        """
        self.api_key_id = api_key_id
        self.username = username
        self.password = password
        self._session: Optional[TGCSession] = None
        self._last_request_time = 0.0
        self._designer_id: Optional[str] = None

    async def _rate_limit(self):
        """Enforce rate limiting between requests"""
        now = time.time()
        elapsed = now - self._last_request_time
        if elapsed < RATE_LIMIT_DELAY:
            await asyncio.sleep(RATE_LIMIT_DELAY - elapsed)
        self._last_request_time = time.time()

    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        files: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Make a request to the TGC API

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint (e.g., "/session")
            data: Form data for POST/PUT
            files: Files to upload
            params: Query parameters

        Returns:
            Response JSON

        Raises:
            Exception on API error
        """
        await self._rate_limit()

        url = f"{TGC_API_BASE}{endpoint}"

        # Add session_id to params if authenticated
        if params is None:
            params = {}
        if self._session and "session_id" not in params:
            params["session_id"] = self._session.session_id

        async with httpx.AsyncClient(timeout=60.0) as client:
            if method.upper() == "GET":
                response = await client.get(url, params=params)
            elif method.upper() == "POST":
                if files:
                    # Multipart form data with files
                    response = await client.post(url, data=data, files=files, params=params)
                else:
                    response = await client.post(url, data=data, params=params)
            elif method.upper() == "PUT":
                response = await client.put(url, data=data, params=params)
            elif method.upper() == "DELETE":
                response = await client.delete(url, params=params)
            else:
                raise ValueError(f"Unsupported method: {method}")

            result = response.json()

            # Check for errors
            if "error" in result:
                error = result["error"]
                error_msg = error.get("message", "Unknown error")
                error_code = error.get("code", 500)
                logger.error(f"TGC API error ({error_code}): {error_msg}")
                raise Exception(f"TGC API error: {error_msg}")

            return result.get("result", result)

    async def authenticate(self) -> TGCSession:
        """
        Authenticate with TGC and create a session

        Returns:
            TGCSession with session info

        Raises:
            Exception on authentication failure
        """
        logger.info("Authenticating with The Game Crafter...")

        result = await self._request(
            "POST",
            "/session",
            data={
                "username": self.username,
                "password": self.password,
                "api_key_id": self.api_key_id,
            },
            params={},  # Don't include session_id for auth
        )

        session_id = result.get("id")
        user_id = result.get("user_id")

        if not session_id or not user_id:
            raise Exception("Authentication failed: missing session or user ID")

        # Get user info to get root folder
        user_result = await self._request(
            "GET",
            f"/user/{user_id}",
            params={"session_id": session_id},
        )

        root_folder_id = user_result.get("root_folder_id")
        username = user_result.get("username", self.username)

        self._session = TGCSession(
            session_id=session_id,
            user_id=user_id,
            username=username,
            root_folder_id=root_folder_id,
        )

        logger.info(f"Authenticated as {username} (user_id: {user_id})")
        return self._session

    async def create_folder(self, name: str, parent_id: Optional[str] = None) -> str:
        """
        Create a folder for organizing deck images

        Args:
            name: Folder name
            parent_id: Parent folder ID (defaults to root)

        Returns:
            Created folder ID
        """
        if not self._session:
            raise Exception("Not authenticated")

        result = await self._request(
            "POST",
            "/folder",
            data={
                "name": name,
                "user_id": self._session.user_id,
                "parent_id": parent_id or self._session.root_folder_id,
            },
        )

        folder_id = result.get("id")
        logger.info(f"Created folder '{name}' with ID: {folder_id}")
        return folder_id

    async def upload_file(
        self,
        file_data: bytes,
        filename: str,
        folder_id: str,
    ) -> TGCUploadResult:
        """
        Upload an image file to TGC

        Args:
            file_data: Image bytes
            filename: Filename to use
            folder_id: Destination folder ID

        Returns:
            TGCUploadResult with file ID
        """
        if not self._session:
            raise Exception("Not authenticated")

        try:
            result = await self._request(
                "POST",
                "/file",
                data={
                    "folder_id": folder_id,
                    "name": filename,
                },
                files={
                    "file": (filename, file_data, "image/png"),
                },
            )

            file_id = result.get("id")
            logger.debug(f"Uploaded file '{filename}' with ID: {file_id}")

            return TGCUploadResult(success=True, file_id=file_id)

        except Exception as e:
            logger.error(f"Failed to upload file '{filename}': {e}")
            return TGCUploadResult(success=False, error=str(e))

    async def get_or_create_designer(self, name: Optional[str] = None) -> str:
        """
        Get existing designer or create a new one

        Args:
            name: Designer name (defaults to username)

        Returns:
            Designer ID
        """
        if not self._session:
            raise Exception("Not authenticated")

        # Return cached designer if available
        if self._designer_id:
            return self._designer_id

        # Check for existing designers
        try:
            result = await self._request("GET", "/designer")
            designers = result.get("items", [])

            # Use first designer if any exist
            if designers:
                self._designer_id = designers[0].get("id")
                logger.info(f"Using existing designer: {self._designer_id}")
                return self._designer_id
        except Exception:
            pass  # No existing designers

        # Create new designer
        designer_name = name or f"{self._session.username}'s Designs"
        result = await self._request(
            "POST",
            "/designer",
            data={
                "name": designer_name,
                "user_id": self._session.user_id,
            },
        )

        self._designer_id = result.get("id")
        logger.info(f"Created designer '{designer_name}' with ID: {self._designer_id}")
        return self._designer_id

    async def create_game(
        self,
        name: str,
        description: str = "",
    ) -> str:
        """
        Create a new game product

        Args:
            name: Game/product name
            description: Product description

        Returns:
            Game ID
        """
        if not self._session:
            raise Exception("Not authenticated")

        designer_id = await self.get_or_create_designer()

        result = await self._request(
            "POST",
            "/game",
            data={
                "name": name,
                "designer_id": designer_id,
                "description": description or f"Custom tarot deck: {name}",
                "short_description": f"Custom tarot deck created with The Program",
            },
        )

        game_id = result.get("id")
        logger.info(f"Created game '{name}' with ID: {game_id}")
        return game_id

    async def create_tarot_deck(
        self,
        game_id: str,
        deck_name: str,
        card_back_file_id: str,
    ) -> str:
        """
        Create a tarot deck component

        Args:
            game_id: Parent game ID
            deck_name: Deck name
            card_back_file_id: File ID for card back image

        Returns:
            Deck ID
        """
        result = await self._request(
            "POST",
            "/deck",
            data={
                "name": deck_name,
                "game_id": game_id,
                "identity": "TarotDeck",
                "back_id": card_back_file_id,
                "has_proofed_back": "1",
            },
        )

        deck_id = result.get("id")
        logger.info(f"Created TarotDeck '{deck_name}' with ID: {deck_id}")
        return deck_id

    async def add_cards_to_deck(
        self,
        deck_id: str,
        cards: List[Dict[str, str]],
    ) -> int:
        """
        Add cards to a deck using bulk endpoint

        Args:
            deck_id: Deck ID
            cards: List of cards with 'name' and 'face_id' keys

        Returns:
            Number of cards added
        """
        # TGC allows up to 100 cards per bulk request
        total_added = 0

        for i in range(0, len(cards), 100):
            batch = cards[i:i+100]

            # Format cards for bulk endpoint
            import json
            cards_json = json.dumps(batch)

            result = await self._request(
                "POST",
                f"/deck/{deck_id}/bulk-cards",
                data={"cards": cards_json},
            )

            added = len(result.get("cards", []))
            total_added += added
            logger.info(f"Added {added} cards to deck (batch {i//100 + 1})")

        return total_added

    async def get_game_urls(self, game_id: str) -> Dict[str, str]:
        """
        Get URLs for game page and checkout

        Args:
            game_id: Game ID

        Returns:
            Dict with 'view_url' and 'checkout_url'
        """
        result = await self._request("GET", f"/game/{game_id}")

        view_uri = result.get("view_uri", "")

        return {
            "view_url": f"https://www.thegamecrafter.com{view_uri}" if view_uri else "",
            "checkout_url": f"https://www.thegamecrafter.com/games/{game_id}/addtocart",
        }

    async def submit_deck_for_printing(
        self,
        deck_name: str,
        card_images: List[Dict[str, Any]],
        card_back_image: bytes,
        description: str = "",
        progress_callback: Optional[Callable[[str, int, int], Awaitable[None]]] = None,
    ) -> TGCPrintSubmission:
        """
        Complete workflow to submit a tarot deck for printing

        Args:
            deck_name: Name for the deck
            card_images: List of dicts with 'name', 'item_key', and 'image_data' (bytes)
            card_back_image: Bytes of the card back image
            description: Optional deck description
            progress_callback: Async callback(stage, current, total)

        Returns:
            TGCPrintSubmission with game/deck IDs and URLs
        """
        try:
            # Step 1: Authenticate
            if progress_callback:
                await progress_callback("Authenticating", 0, 100)

            await self.authenticate()

            # Step 2: Create folder for images
            if progress_callback:
                await progress_callback("Creating folder", 5, 100)

            folder_name = f"tarot_{deck_name}_{int(time.time())}"
            folder_id = await self.create_folder(folder_name)

            # Step 3: Upload card back
            if progress_callback:
                await progress_callback("Uploading card back", 10, 100)

            back_result = await self.upload_file(
                card_back_image,
                "card_back.png",
                folder_id,
            )

            if not back_result.success:
                return TGCPrintSubmission(
                    success=False,
                    error=f"Failed to upload card back: {back_result.error}",
                )

            card_back_file_id = back_result.file_id

            # Step 4: Upload all card face images
            total_cards = len(card_images)
            uploaded_cards = []

            for idx, card in enumerate(card_images):
                progress = 10 + int((idx / total_cards) * 60)  # 10-70%
                if progress_callback:
                    await progress_callback(f"Uploading {card.get('name', f'card {idx+1}')}", progress, 100)

                result = await self.upload_file(
                    card["image_data"],
                    f"{card.get('item_key', f'card_{idx}')}.png",
                    folder_id,
                )

                if result.success:
                    uploaded_cards.append({
                        "name": card.get("name", f"Card {idx+1}"),
                        "face_id": result.file_id,
                    })
                else:
                    logger.warning(f"Failed to upload card {card.get('name')}: {result.error}")

            if not uploaded_cards:
                return TGCPrintSubmission(
                    success=False,
                    error="No cards were successfully uploaded",
                )

            # Step 5: Create game
            if progress_callback:
                await progress_callback("Creating product", 75, 100)

            game_id = await self.create_game(deck_name, description)

            # Step 6: Create deck
            if progress_callback:
                await progress_callback("Creating deck", 80, 100)

            deck_id = await self.create_tarot_deck(game_id, deck_name, card_back_file_id)

            # Step 7: Add cards to deck
            if progress_callback:
                await progress_callback("Adding cards to deck", 85, 100)

            cards_added = await self.add_cards_to_deck(deck_id, uploaded_cards)

            # Step 8: Get URLs
            if progress_callback:
                await progress_callback("Finalizing", 95, 100)

            urls = await self.get_game_urls(game_id)

            if progress_callback:
                await progress_callback("Complete", 100, 100)

            return TGCPrintSubmission(
                success=True,
                game_id=game_id,
                deck_id=deck_id,
                game_url=urls["view_url"],
                checkout_url=urls["checkout_url"],
                cards_uploaded=cards_added,
                details={
                    "folder_id": folder_id,
                    "card_back_file_id": card_back_file_id,
                    "total_cards": total_cards,
                    "successfully_uploaded": len(uploaded_cards),
                },
            )

        except Exception as e:
            logger.error(f"Print submission failed: {e}")
            return TGCPrintSubmission(
                success=False,
                error=str(e),
            )

    async def logout(self):
        """End the current session"""
        if self._session:
            try:
                await self._request(
                    "DELETE",
                    f"/session/{self._session.session_id}",
                )
                logger.info("Logged out from TGC")
            except Exception as e:
                logger.warning(f"Logout failed: {e}")
            finally:
                self._session = None


# Factory function
def get_game_crafter_service(
    api_key_id: str,
    username: str,
    password: str,
) -> GameCrafterService:
    """
    Create a GameCrafterService instance

    Args:
        api_key_id: TGC API Key ID
        username: TGC account username
        password: TGC account password

    Returns:
        GameCrafterService instance
    """
    return GameCrafterService(
        api_key_id=api_key_id,
        username=username,
        password=password,
    )
