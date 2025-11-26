"""
Reports API Routes

Provides endpoints for generating PDF reports.
Part of Phase 3: Reports & Sharing
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.core.database import get_db
from app.models_sqlite.chart import BirthData, Chart
from app.services.report_service import get_report_service
from app.services.chart_calculator import ChartCalculator

router = APIRouter()


@router.get("/birth-chart/{chart_id}")
async def generate_birth_chart_report(
    chart_id: str,
    include_interpretations: bool = True,
    db: Session = Depends(get_db)
):
    """
    Generate a PDF report for a birth chart.

    Returns a downloadable PDF document with planetary positions,
    houses, aspects, and optional AI interpretations.
    """
    # Get chart and birth data
    chart = db.query(Chart).filter(Chart.id == chart_id).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    birth_data = db.query(BirthData).filter(BirthData.id == chart.birth_data_id).first()
    if not birth_data:
        raise HTTPException(status_code=404, detail="Birth data not found")

    # Prepare data for report
    chart_data = chart.chart_data if chart.chart_data else {}
    birth_info = {
        "name": birth_data.name,
        "birth_date": birth_data.birth_date.strftime("%B %d, %Y") if birth_data.birth_date else "Unknown",
        "birth_time": birth_data.birth_time.strftime("%I:%M %p") if birth_data.birth_time else "Unknown",
        "location": birth_data.location or "Unknown",
        "latitude": birth_data.latitude or 0,
        "longitude": birth_data.longitude or 0,
    }

    # Get interpretations if requested
    interpretations = None
    if include_interpretations and chart.interpretations:
        interpretations = chart.interpretations

    # Generate report
    report_service = get_report_service()
    pdf_bytes = report_service.generate_birth_chart_report(
        chart_data=chart_data,
        birth_data=birth_info,
        interpretations=interpretations
    )

    # Create filename
    safe_name = "".join(c for c in birth_data.name if c.isalnum() or c in (' ', '-', '_')).strip()
    filename = f"birth_chart_{safe_name.replace(' ', '_')}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/birth-chart/by-birth-data/{birth_data_id}")
async def generate_birth_chart_report_by_birth_data(
    birth_data_id: str,
    include_interpretations: bool = True,
    db: Session = Depends(get_db)
):
    """
    Generate a PDF report using birth data ID (calculates chart on-the-fly).
    """
    # Get birth data
    birth_data = db.query(BirthData).filter(BirthData.id == birth_data_id).first()
    if not birth_data:
        raise HTTPException(status_code=404, detail="Birth data not found")

    # Check for existing chart
    chart = db.query(Chart).filter(Chart.birth_data_id == birth_data_id).first()

    chart_data = {}
    interpretations = None

    if chart and chart.chart_data:
        chart_data = chart.chart_data
        if include_interpretations and chart.interpretations:
            interpretations = chart.interpretations
    else:
        # Calculate chart on the fly
        try:
            calculator = ChartCalculator()
            from datetime import datetime
            birth_datetime = datetime.combine(birth_data.birth_date, birth_data.birth_time)
            chart_data = calculator.calculate_chart(
                birth_datetime,
                birth_data.latitude,
                birth_data.longitude
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to calculate chart: {str(e)}"
            )

    # Prepare birth info
    birth_info = {
        "name": birth_data.name,
        "birth_date": birth_data.birth_date.strftime("%B %d, %Y") if birth_data.birth_date else "Unknown",
        "birth_time": birth_data.birth_time.strftime("%I:%M %p") if birth_data.birth_time else "Unknown",
        "location": birth_data.location or "Unknown",
        "latitude": birth_data.latitude or 0,
        "longitude": birth_data.longitude or 0,
    }

    # Generate report
    report_service = get_report_service()
    pdf_bytes = report_service.generate_birth_chart_report(
        chart_data=chart_data,
        birth_data=birth_info,
        interpretations=interpretations
    )

    # Create filename
    safe_name = "".join(c for c in birth_data.name if c.isalnum() or c in (' ', '-', '_')).strip()
    filename = f"birth_chart_{safe_name.replace(' ', '_')}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/transit/{birth_data_id}")
async def generate_transit_report(
    birth_data_id: str,
    db: Session = Depends(get_db)
):
    """
    Generate a PDF transit report for the given birth data.
    """
    from app.services.transit_calculator import get_transit_calculator

    # Get birth data
    birth_data = db.query(BirthData).filter(BirthData.id == birth_data_id).first()
    if not birth_data:
        raise HTTPException(status_code=404, detail="Birth data not found")

    # Get natal chart
    chart = db.query(Chart).filter(Chart.birth_data_id == birth_data_id).first()
    if not chart or not chart.chart_data:
        raise HTTPException(status_code=404, detail="No chart found for this birth data")

    # Calculate current transits
    try:
        transit_calc = get_transit_calculator()
        from datetime import datetime
        transits = transit_calc.calculate_transits(
            chart.chart_data,
            datetime.now()
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate transits: {str(e)}"
        )

    # Prepare birth info
    birth_info = {
        "name": birth_data.name,
        "birth_date": birth_data.birth_date.strftime("%B %d, %Y") if birth_data.birth_date else "Unknown",
    }

    # Generate report
    report_service = get_report_service()
    pdf_bytes = report_service.generate_transit_report(
        transits=transits.get('active_transits', []),
        birth_data=birth_info,
        forecast=None  # Could add AI forecast here
    )

    # Create filename
    safe_name = "".join(c for c in birth_data.name if c.isalnum() or c in (' ', '-', '_')).strip()
    filename = f"transit_report_{safe_name.replace(' ', '_')}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/journal/export/{format}")
async def export_journal(
    format: str,
    db: Session = Depends(get_db)
):
    """
    Export journal entries to PDF or JSON format.
    """
    from app.models_sqlite.journal import JournalEntry

    if format not in ['pdf', 'json']:
        raise HTTPException(status_code=400, detail="Format must be 'pdf' or 'json'")

    # Get all journal entries
    entries = db.query(JournalEntry).order_by(JournalEntry.created_at.desc()).all()

    if format == 'json':
        import json
        export_data = []
        for entry in entries:
            export_data.append({
                "id": str(entry.id),
                "title": entry.title,
                "content": entry.content,
                "mood": entry.mood,
                "tags": entry.tags or [],
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
            })

        return StreamingResponse(
            io.BytesIO(json.dumps(export_data, indent=2).encode('utf-8')),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=journal_export.json"}
        )

    # PDF format
    report_service = get_report_service()

    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        story.append(Paragraph("Journal Export", styles['Title']))
        story.append(Spacer(1, 20))

        for entry in entries:
            story.append(Paragraph(entry.title or "Untitled", styles['Heading2']))
            if entry.created_at:
                story.append(Paragraph(
                    entry.created_at.strftime("%B %d, %Y"),
                    styles['Normal']
                ))
            if entry.mood:
                story.append(Paragraph(f"Mood: {entry.mood}", styles['Normal']))
            story.append(Spacer(1, 10))
            if entry.content:
                story.append(Paragraph(entry.content, styles['Normal']))
            story.append(Spacer(1, 20))

        doc.build(story)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=journal_export.pdf"}
        )
    except ImportError:
        # Fallback to JSON if reportlab not available
        raise HTTPException(
            status_code=500,
            detail="PDF generation not available. Please use JSON format."
        )


@router.get("/timeline/export/{format}")
async def export_timeline(
    format: str,
    db: Session = Depends(get_db)
):
    """
    Export timeline events to PDF or JSON format.
    """
    from app.models_sqlite.timeline import TimelineEvent

    if format not in ['pdf', 'json']:
        raise HTTPException(status_code=400, detail="Format must be 'pdf' or 'json'")

    # Get all timeline events
    events = db.query(TimelineEvent).order_by(TimelineEvent.event_date.desc()).all()

    if format == 'json':
        import json
        export_data = []
        for event in events:
            export_data.append({
                "id": str(event.id),
                "title": event.title,
                "description": event.description,
                "event_date": event.event_date.isoformat() if event.event_date else None,
                "category": event.category,
                "significance": event.significance,
                "created_at": event.created_at.isoformat() if event.created_at else None,
            })

        return StreamingResponse(
            io.BytesIO(json.dumps(export_data, indent=2).encode('utf-8')),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=timeline_export.json"}
        )

    # PDF format
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        story.append(Paragraph("Timeline Export", styles['Title']))
        story.append(Spacer(1, 20))

        for event in events:
            story.append(Paragraph(event.title or "Untitled", styles['Heading2']))
            if event.event_date:
                story.append(Paragraph(
                    event.event_date.strftime("%B %d, %Y"),
                    styles['Normal']
                ))
            if event.category:
                story.append(Paragraph(f"Category: {event.category}", styles['Normal']))
            story.append(Spacer(1, 10))
            if event.description:
                story.append(Paragraph(event.description, styles['Normal']))
            story.append(Spacer(1, 20))

        doc.build(story)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=timeline_export.pdf"}
        )
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="PDF generation not available. Please use JSON format."
        )
