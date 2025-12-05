"""
Card Game Service

Provides game logic for solitaire and cribbage using tarot deck mappings.
Part of Phase 6: Cards Module
"""
import random
from typing import Dict, List, Optional, Any, Tuple
from itertools import combinations
from copy import deepcopy


# ============= Tarot to Playing Card Mapping =============

# Map tarot suits to playing card suits
SUIT_MAPPING = {
    "wands": "clubs",      # Fire -> Clubs
    "cups": "hearts",      # Water -> Hearts
    "swords": "spades",    # Air -> Spades
    "pentacles": "diamonds"  # Earth -> Diamonds
}

# Map tarot ranks to playing card ranks
RANK_MAPPING = {
    1: ("A", 1),    # Ace
    2: ("2", 2),
    3: ("3", 3),
    4: ("4", 4),
    5: ("5", 5),
    6: ("6", 6),
    7: ("7", 7),
    8: ("8", 8),
    9: ("9", 9),
    10: ("10", 10),
    11: ("J", 10),  # Page -> Jack (value 10 for cribbage face cards)
    12: ("Q", 10),  # Knight -> Queen
    13: ("Q", 10),  # Queen -> Queen (skip, use one Queen)
    14: ("K", 10),  # King -> King
}

# For a 52-card deck, we use ranks 1-10, 11 (Page->Jack), 12 (Knight->Queen), 14 (King)
# Skip tarot Queens (13) to get exactly 52 cards
VALID_RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14]


class CardGameService:
    """Service for card game logic"""

    def __init__(self):
        self.deck_template = self._build_deck_mapping()

    def _build_deck_mapping(self) -> List[Dict[str, Any]]:
        """
        Build the mapping from tarot Minor Arcana to 52 playing cards.

        Uses the 4 suits (Wands, Cups, Swords, Pentacles) and 13 ranks each.
        Skips the Queen rank (position 13) to get exactly 52 cards.
        """
        deck = []

        for tarot_suit, playing_suit in SUIT_MAPPING.items():
            for rank_num in VALID_RANKS:
                rank_symbol, value = RANK_MAPPING[rank_num]

                # For Ace value in different contexts
                if rank_num == 1:
                    value = 1  # Low ace for cribbage counting, can be high in solitaire

                card = {
                    "id": f"{tarot_suit}_{rank_num}",
                    "tarot_name": self._get_tarot_name(tarot_suit, rank_num),
                    "suit": playing_suit,
                    "rank": rank_symbol,
                    "rank_value": rank_num if rank_num <= 10 else (11 if rank_num == 11 else (12 if rank_num == 12 else 13)),
                    "value": value,  # For cribbage scoring
                    "color": "red" if playing_suit in ("hearts", "diamonds") else "black",
                    "face_up": True,
                    "image_url": None
                }
                deck.append(card)

        return deck

    def _get_tarot_name(self, suit: str, rank: int) -> str:
        """Get the tarot card name for a suit and rank"""
        if rank == 1:
            return f"Ace of {suit.title()}"
        elif rank <= 10:
            names = ["", "Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"]
            return f"{names[rank]} of {suit.title()}"
        elif rank == 11:
            return f"Page of {suit.title()}"
        elif rank == 12:
            return f"Knight of {suit.title()}"
        elif rank == 13:
            return f"Queen of {suit.title()}"
        else:
            return f"King of {suit.title()}"

    def get_shuffled_deck(self, collection_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get a shuffled copy of the deck"""
        deck = deepcopy(self.deck_template)
        random.shuffle(deck)

        # TODO: If collection_id is provided, add image URLs from the collection

        return deck

    def get_deck_mapping(self) -> Dict[str, Any]:
        """Get the full tarot-to-playing-card mapping"""
        return {
            "mappings": self.deck_template,
            "description": "Tarot Minor Arcana mapped to 52 playing cards. "
                          "Wands->Clubs, Cups->Hearts, Swords->Spades, Pentacles->Diamonds. "
                          "Page->Jack, Knight->Queen, Queen skipped, King->King."
        }

    # ============= Solitaire (Klondike) Logic =============

    def create_solitaire_game(self, draw_count: int = 1) -> Dict[str, Any]:
        """
        Create a new Klondike solitaire game.

        Layout:
        - 7 tableau piles (1-7 cards, top card face up)
        - 4 foundation piles (build A-K by suit)
        - Stock pile (remaining cards)
        - Waste pile (cards drawn from stock)
        """
        deck = self.get_shuffled_deck()

        # Deal to tableau
        tableau = []
        card_index = 0
        for pile_num in range(7):
            pile = []
            for card_pos in range(pile_num + 1):
                card = deck[card_index]
                card["face_up"] = (card_pos == pile_num)  # Only top card face up
                pile.append(card)
                card_index += 1
            tableau.append(pile)

        # Remaining cards go to stock
        stock = []
        for i in range(card_index, len(deck)):
            deck[i]["face_up"] = False
            stock.append(deck[i])

        return {
            "tableau": tableau,
            "foundations": [[], [], [], []],  # hearts, diamonds, clubs, spades
            "stock": stock,
            "waste": [],
            "draw_count": draw_count
        }

    def get_solitaire_valid_moves(self, state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get all valid moves in current solitaire state"""
        moves = []

        # Draw from stock
        if state["stock"]:
            moves.append({
                "move_type": "draw",
                "description": f"Draw {state['draw_count']} card(s) from stock"
            })
        elif state["waste"]:
            moves.append({
                "move_type": "reset_stock",
                "description": "Reset stock from waste pile"
            })

        # Waste to tableau
        if state["waste"]:
            waste_card = state["waste"][-1]
            for i, pile in enumerate(state["tableau"]):
                if self._can_place_on_tableau(waste_card, pile):
                    moves.append({
                        "move_type": "waste_to_tableau",
                        "to_pile": f"tableau_{i}",
                        "card_id": waste_card["id"],
                        "description": f"Move {waste_card['rank']}{waste_card['suit'][0].upper()} to tableau {i+1}"
                    })

        # Waste to foundation
        if state["waste"]:
            waste_card = state["waste"][-1]
            for i, foundation in enumerate(state["foundations"]):
                if self._can_place_on_foundation(waste_card, foundation):
                    moves.append({
                        "move_type": "waste_to_foundation",
                        "to_pile": f"foundation_{i}",
                        "card_id": waste_card["id"],
                        "description": f"Move {waste_card['rank']}{waste_card['suit'][0].upper()} to foundation"
                    })

        # Tableau to tableau
        for i, from_pile in enumerate(state["tableau"]):
            face_up_start = self._get_face_up_start(from_pile)
            if face_up_start == -1:
                continue

            for card_count in range(1, len(from_pile) - face_up_start + 1):
                move_card = from_pile[face_up_start + card_count - 1]
                if not move_card["face_up"]:
                    continue

                for j, to_pile in enumerate(state["tableau"]):
                    if i == j:
                        continue

                    # Get the bottom card of the sequence we're moving
                    bottom_card = from_pile[face_up_start]
                    if self._can_place_on_tableau(bottom_card, to_pile):
                        cards_desc = f"{len(from_pile) - face_up_start} card(s)" if card_count > 1 else f"{bottom_card['rank']}{bottom_card['suit'][0].upper()}"
                        moves.append({
                            "move_type": "tableau_move",
                            "from_pile": f"tableau_{i}",
                            "to_pile": f"tableau_{j}",
                            "card_count": len(from_pile) - face_up_start,
                            "description": f"Move {cards_desc} from tableau {i+1} to {j+1}"
                        })
                        break  # Only need one move per sequence

        # Tableau to foundation
        for i, pile in enumerate(state["tableau"]):
            if not pile:
                continue
            top_card = pile[-1]
            if not top_card["face_up"]:
                continue

            for j, foundation in enumerate(state["foundations"]):
                if self._can_place_on_foundation(top_card, foundation):
                    moves.append({
                        "move_type": "tableau_to_foundation",
                        "from_pile": f"tableau_{i}",
                        "to_pile": f"foundation_{j}",
                        "card_id": top_card["id"],
                        "description": f"Move {top_card['rank']}{top_card['suit'][0].upper()} to foundation"
                    })

        return moves

    def _get_face_up_start(self, pile: List[Dict]) -> int:
        """Get index of first face-up card in pile"""
        for i, card in enumerate(pile):
            if card["face_up"]:
                return i
        return -1

    def _can_place_on_tableau(self, card: Dict, pile: List[Dict]) -> bool:
        """Check if card can be placed on tableau pile"""
        if not pile:
            # Only Kings can go on empty tableau
            return card["rank"] == "K"

        top_card = pile[-1]
        if not top_card["face_up"]:
            return False

        # Must be opposite color and one rank lower
        if card["color"] == top_card["color"]:
            return False

        rank_order = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
        card_rank_idx = rank_order.index(card["rank"])
        top_rank_idx = rank_order.index(top_card["rank"])

        return card_rank_idx == top_rank_idx - 1

    def _can_place_on_foundation(self, card: Dict, foundation: List[Dict]) -> bool:
        """Check if card can be placed on foundation pile"""
        if not foundation:
            # Only Aces can start foundations
            return card["rank"] == "A"

        top_card = foundation[-1]

        # Must be same suit and next rank
        if card["suit"] != top_card["suit"]:
            return False

        rank_order = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
        card_rank_idx = rank_order.index(card["rank"])
        top_rank_idx = rank_order.index(top_card["rank"])

        return card_rank_idx == top_rank_idx + 1

    def make_solitaire_move(self, state: Dict[str, Any], move: Dict[str, Any]) -> Tuple[Dict[str, Any], bool, str]:
        """
        Execute a solitaire move.
        Returns: (new_state, success, message)
        """
        state = deepcopy(state)
        move_type = move.get("move_type")

        if move_type == "draw":
            if not state["stock"]:
                return state, False, "Stock is empty"

            draw_count = min(state["draw_count"], len(state["stock"]))
            for _ in range(draw_count):
                card = state["stock"].pop()
                card["face_up"] = True
                state["waste"].append(card)

            return state, True, f"Drew {draw_count} card(s)"

        elif move_type == "reset_stock":
            if state["stock"]:
                return state, False, "Stock is not empty"
            if not state["waste"]:
                return state, False, "Waste is empty"

            # Move all waste back to stock, reversed and face down
            state["stock"] = list(reversed(state["waste"]))
            for card in state["stock"]:
                card["face_up"] = False
            state["waste"] = []

            return state, True, "Reset stock from waste"

        elif move_type == "waste_to_tableau":
            if not state["waste"]:
                return state, False, "No cards in waste"

            pile_idx = int(move["to_pile"].split("_")[1])
            card = state["waste"][-1]

            if not self._can_place_on_tableau(card, state["tableau"][pile_idx]):
                return state, False, "Invalid move"

            state["waste"].pop()
            state["tableau"][pile_idx].append(card)

            return state, True, f"Moved {card['rank']} to tableau"

        elif move_type == "waste_to_foundation":
            if not state["waste"]:
                return state, False, "No cards in waste"

            pile_idx = int(move["to_pile"].split("_")[1])
            card = state["waste"][-1]

            if not self._can_place_on_foundation(card, state["foundations"][pile_idx]):
                return state, False, "Invalid move"

            state["waste"].pop()
            state["foundations"][pile_idx].append(card)

            return state, True, f"Moved {card['rank']} to foundation"

        elif move_type == "tableau_move":
            from_idx = int(move["from_pile"].split("_")[1])
            to_idx = int(move["to_pile"].split("_")[1])
            card_count = move.get("card_count", 1)

            from_pile = state["tableau"][from_idx]
            if len(from_pile) < card_count:
                return state, False, "Not enough cards"

            # Find the start of face-up cards
            face_up_start = self._get_face_up_start(from_pile)
            if face_up_start == -1 or len(from_pile) - face_up_start < card_count:
                return state, False, "Invalid card count"

            # Get the cards to move (from face_up_start)
            moving_cards = from_pile[face_up_start:]
            bottom_card = moving_cards[0]

            if not self._can_place_on_tableau(bottom_card, state["tableau"][to_idx]):
                return state, False, "Invalid move"

            # Execute move
            state["tableau"][from_idx] = from_pile[:face_up_start]
            state["tableau"][to_idx].extend(moving_cards)

            # Flip new top card if needed
            if state["tableau"][from_idx]:
                state["tableau"][from_idx][-1]["face_up"] = True

            return state, True, f"Moved {len(moving_cards)} card(s)"

        elif move_type == "tableau_to_foundation":
            from_idx = int(move["from_pile"].split("_")[1])
            to_idx = int(move["to_pile"].split("_")[1])

            from_pile = state["tableau"][from_idx]
            if not from_pile:
                return state, False, "Pile is empty"

            card = from_pile[-1]
            if not card["face_up"]:
                return state, False, "Card is face down"

            if not self._can_place_on_foundation(card, state["foundations"][to_idx]):
                return state, False, "Invalid move"

            state["tableau"][from_idx].pop()
            state["foundations"][to_idx].append(card)

            # Flip new top card if needed
            if state["tableau"][from_idx]:
                state["tableau"][from_idx][-1]["face_up"] = True

            return state, True, f"Moved {card['rank']} to foundation"

        return state, False, "Unknown move type"

    def check_solitaire_win(self, state: Dict[str, Any]) -> bool:
        """Check if solitaire game is won (all cards in foundations)"""
        total_foundation_cards = sum(len(f) for f in state["foundations"])
        return total_foundation_cards == 52

    def get_solitaire_hint(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Get a hint for the current solitaire state"""
        moves = self.get_solitaire_valid_moves(state)

        # Prioritize moves
        for move in moves:
            if move["move_type"] in ("waste_to_foundation", "tableau_to_foundation"):
                return {
                    "hint_type": "foundation",
                    "message": "Move a card to the foundation!",
                    "suggested_move": move
                }

        for move in moves:
            if move["move_type"] == "tableau_move":
                return {
                    "hint_type": "tableau",
                    "message": "Try moving cards between tableau piles",
                    "suggested_move": move
                }

        for move in moves:
            if move["move_type"] in ("waste_to_tableau",):
                return {
                    "hint_type": "waste",
                    "message": "Play a card from the waste pile",
                    "suggested_move": move
                }

        if moves:
            return {
                "hint_type": "draw",
                "message": "Draw more cards from the stock",
                "suggested_move": moves[0]
            }

        return {
            "hint_type": "stuck",
            "message": "No valid moves available. The game may be unwinnable.",
            "suggested_move": None
        }

    # ============= Cribbage Logic =============

    def create_cribbage_game(self, dealer: str = "opponent") -> Dict[str, Any]:
        """
        Create a new cribbage game.

        Standard 2-player cribbage:
        - Each player gets 6 cards, discards 2 to crib
        - Cut card revealed
        - Pegging phase (play to 31)
        - Counting phase (15s, pairs, runs, flush)
        - First to 121 points wins
        """
        deck = self.get_shuffled_deck()

        # Deal 6 cards to each player
        player_hand = deck[:6]
        opponent_hand = deck[6:12]
        remaining_deck = deck[12:]

        for card in player_hand:
            card["face_up"] = True
        for card in opponent_hand:
            card["face_up"] = False  # Hidden until scoring

        return {
            "player_hand": player_hand,
            "opponent_hand": opponent_hand,
            "crib": [],
            "cut_card": None,
            "pegging_pile": [],
            "pegging_count": 0,
            "deck": remaining_deck,
            "dealer": dealer,
            "phase": "discard",  # discard, cut, pegging, counting, done
            "is_go": False,
            "last_to_play": None,
            "player_pegging_played": [],
            "opponent_pegging_played": []
        }

    def cribbage_discard(self, state: Dict[str, Any], card_ids: List[str], is_player: bool = True) -> Tuple[Dict[str, Any], bool, str]:
        """Discard cards to the crib"""
        state = deepcopy(state)

        if state["phase"] != "discard":
            return state, False, "Not in discard phase"

        if len(card_ids) != 2:
            return state, False, "Must discard exactly 2 cards"

        hand_key = "player_hand" if is_player else "opponent_hand"
        hand = state[hand_key]

        # Find and remove discarded cards
        discarded = []
        remaining = []
        for card in hand:
            if card["id"] in card_ids:
                discarded.append(card)
            else:
                remaining.append(card)

        if len(discarded) != 2:
            return state, False, "Cards not found in hand"

        state[hand_key] = remaining
        state["crib"].extend(discarded)

        # Check if both players have discarded
        if len(state["player_hand"]) == 4 and len(state["opponent_hand"]) == 4:
            state["phase"] = "cut"

        return state, True, "Discarded 2 cards to crib"

    def cribbage_cut(self, state: Dict[str, Any]) -> Tuple[Dict[str, Any], bool, str]:
        """Cut the deck to reveal starter card"""
        state = deepcopy(state)

        if state["phase"] != "cut":
            return state, False, "Not in cut phase"

        if not state["deck"]:
            return state, False, "No cards to cut"

        # Random cut
        cut_idx = random.randint(0, len(state["deck"]) - 1)
        state["cut_card"] = state["deck"].pop(cut_idx)
        state["cut_card"]["face_up"] = True

        # Check for "his heels" (Jack as cut card gives dealer 2 points)
        points = 0
        if state["cut_card"]["rank"] == "J":
            points = 2

        state["phase"] = "pegging"

        # Non-dealer plays first
        state["current_turn"] = "opponent" if state["dealer"] == "player" else "player"

        msg = "Cut card revealed"
        if points:
            msg += f". Dealer scores {points} for his heels!"

        return state, True, msg

    def cribbage_peg(self, state: Dict[str, Any], card_id: str, is_player: bool = True) -> Tuple[Dict[str, Any], bool, str, int]:
        """Play a card in the pegging phase"""
        state = deepcopy(state)

        if state["phase"] != "pegging":
            return state, False, "Not in pegging phase", 0

        hand_key = "player_hand" if is_player else "opponent_hand"
        played_key = "player_pegging_played" if is_player else "opponent_pegging_played"

        # Find the card
        card = None
        for c in state[hand_key]:
            if c["id"] == card_id:
                card = c
                break

        if not card:
            return state, False, "Card not in hand", 0

        # Check if play is valid (count <= 31)
        new_count = state["pegging_count"] + card["value"]
        if new_count > 31:
            return state, False, "Play would exceed 31", 0

        # Make the play
        state[hand_key].remove(card)
        card["face_up"] = True
        state["pegging_pile"].append(card)
        state[played_key].append(card)
        state["pegging_count"] = new_count
        state["last_to_play"] = "player" if is_player else "opponent"
        state["is_go"] = False

        # Calculate pegging points
        points = self._calculate_pegging_points(state["pegging_pile"], new_count)

        # Check for 31 - reset count
        if new_count == 31:
            points += 2  # 2 points for hitting 31 exactly
            state["pegging_count"] = 0
            state["pegging_pile"] = []

        # Check if pegging phase is over
        if not state["player_hand"] and not state["opponent_hand"]:
            # Last card bonus
            if state["pegging_count"] > 0 and state["pegging_count"] < 31:
                points += 1  # 1 point for last card (go)
            state["phase"] = "counting"

        # Switch turns
        state["current_turn"] = "opponent" if is_player else "player"

        return state, True, f"Played {card['rank']}{card['suit'][0].upper()} for count of {new_count}", points

    def cribbage_say_go(self, state: Dict[str, Any], is_player: bool = True) -> Tuple[Dict[str, Any], bool, str, int]:
        """Say 'Go' when unable to play"""
        state = deepcopy(state)

        if state["phase"] != "pegging":
            return state, False, "Not in pegging phase", 0

        # Check if player actually can't play
        hand_key = "player_hand" if is_player else "opponent_hand"
        can_play = any(card["value"] + state["pegging_count"] <= 31 for card in state[hand_key])

        if can_play:
            return state, False, "You can still play a card", 0

        state["is_go"] = True
        state["current_turn"] = "opponent" if is_player else "player"

        # If both players said go, give 1 point to last player
        opponent_hand = state["opponent_hand" if is_player else "player_hand"]
        opponent_can_play = any(card["value"] + state["pegging_count"] <= 31 for card in opponent_hand)

        points = 0
        if not opponent_can_play:
            # Both players said go
            points = 1  # Point for go
            state["pegging_count"] = 0
            state["pegging_pile"] = []
            state["is_go"] = False
            # Whoever didn't say go last gets the point
            # ... actually, last to play gets the point

        return state, True, "Said Go", points

    def _calculate_pegging_points(self, pile: List[Dict], count: int) -> int:
        """Calculate points earned from a pegging play"""
        if not pile:
            return 0

        points = 0

        # Check for 15
        if count == 15:
            points += 2

        # Check for pairs/trips/quads
        if len(pile) >= 2:
            last_rank = pile[-1]["rank"]
            pair_count = 1
            for i in range(len(pile) - 2, -1, -1):
                if pile[i]["rank"] == last_rank:
                    pair_count += 1
                else:
                    break

            if pair_count == 2:
                points += 2  # Pair
            elif pair_count == 3:
                points += 6  # Three of a kind
            elif pair_count == 4:
                points += 12  # Four of a kind

        # Check for runs
        if len(pile) >= 3:
            points += self._check_pegging_run(pile)

        return points

    def _check_pegging_run(self, pile: List[Dict]) -> int:
        """Check for a run in pegging pile"""
        rank_values = {"A": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
                       "8": 8, "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13}

        for length in range(len(pile), 2, -1):
            recent = pile[-length:]
            values = sorted([rank_values[c["rank"]] for c in recent])

            # Check if consecutive
            is_run = all(values[i] + 1 == values[i + 1] for i in range(len(values) - 1))
            if is_run:
                return length

        return 0

    def calculate_cribbage_hand(self, hand: List[Dict], cut_card: Dict, is_crib: bool = False) -> Dict[str, int]:
        """Calculate the score for a cribbage hand"""
        all_cards = hand + [cut_card]
        rank_values = {"A": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
                       "8": 8, "9": 9, "10": 10, "J": 10, "Q": 10, "K": 10}
        rank_order = {"A": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
                      "8": 8, "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13}

        score = {
            "fifteens": 0,
            "pairs": 0,
            "runs": 0,
            "flush": 0,
            "nobs": 0,
            "total": 0
        }

        # Fifteens (2 points each)
        for r in range(2, 6):
            for combo in combinations(all_cards, r):
                if sum(rank_values[c["rank"]] for c in combo) == 15:
                    score["fifteens"] += 2

        # Pairs (2 points each)
        for c1, c2 in combinations(all_cards, 2):
            if c1["rank"] == c2["rank"]:
                score["pairs"] += 2

        # Runs
        order_values = [rank_order[c["rank"]] for c in all_cards]
        for length in range(5, 2, -1):
            run_count = 0
            for combo in combinations(range(5), length):
                values = sorted([order_values[i] for i in combo])
                if all(values[i] + 1 == values[i + 1] for i in range(len(values) - 1)):
                    run_count += 1
            if run_count > 0:
                score["runs"] = run_count * length
                break

        # Flush
        hand_suits = [c["suit"] for c in hand]
        if len(set(hand_suits)) == 1:
            if cut_card["suit"] == hand_suits[0]:
                score["flush"] = 5
            elif not is_crib:
                score["flush"] = 4

        # Nobs (Jack of cut suit in hand)
        for card in hand:
            if card["rank"] == "J" and card["suit"] == cut_card["suit"]:
                score["nobs"] = 1
                break

        score["total"] = sum(v for k, v in score.items() if k != "total")
        return score

    def get_ai_cribbage_discard(self, hand: List[Dict], is_dealer: bool, difficulty: str = "medium") -> List[str]:
        """AI chooses which cards to discard to crib"""
        # For now, simple heuristic: keep cards that work well together
        # Discard based on difficulty

        if difficulty == "easy":
            # Random discard
            cards = random.sample(hand, 2)
            return [c["id"] for c in cards]

        # Medium/Hard: Try to keep high-scoring combinations
        best_keep = None
        best_score = -1

        for discard_combo in combinations(hand, 2):
            keep = [c for c in hand if c not in discard_combo]

            # Estimate hand value (simplified)
            score = 0
            rank_values = {"A": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
                           "8": 8, "9": 9, "10": 10, "J": 10, "Q": 10, "K": 10}

            # Count potential fifteens
            for r in range(2, 5):
                for combo in combinations(keep, r):
                    if sum(rank_values[c["rank"]] for c in combo) == 15:
                        score += 2

            # Count pairs
            for c1, c2 in combinations(keep, 2):
                if c1["rank"] == c2["rank"]:
                    score += 2

            # Prefer 5s
            for c in keep:
                if c["rank"] == "5":
                    score += 2

            if score > best_score:
                best_score = score
                best_keep = keep

        discard = [c for c in hand if c not in best_keep]
        return [c["id"] for c in discard]

    def get_ai_cribbage_peg(self, hand: List[Dict], pegging_count: int, pegging_pile: List[Dict], difficulty: str = "medium") -> Optional[str]:
        """AI chooses which card to play during pegging"""
        playable = [c for c in hand if c["value"] + pegging_count <= 31]

        if not playable:
            return None  # Must say Go

        if difficulty == "easy":
            return random.choice(playable)["id"]

        # Medium/Hard: Try to score points or avoid giving points
        best_card = None
        best_score = -1

        for card in playable:
            new_count = pegging_count + card["value"]
            test_pile = pegging_pile + [card]
            points = self._calculate_pegging_points(test_pile, new_count)

            # Bonus for hitting 15 or 31
            if new_count == 15:
                points += 2
            if new_count == 31:
                points += 2

            if points > best_score:
                best_score = points
                best_card = card

        # If no scoring move, play lowest value to leave room
        if best_score == 0:
            best_card = min(playable, key=lambda c: c["value"])

        return best_card["id"] if best_card else playable[0]["id"]

    def check_cribbage_win(self, player_score: int, opponent_score: int) -> Optional[str]:
        """Check if game is won (first to 121)"""
        if player_score >= 121:
            return "player"
        if opponent_score >= 121:
            return "opponent"
        return None
