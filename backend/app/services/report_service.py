"""
Report Service

Generates PDF reports for birth charts and other analyses.
Part of Phase 3: Reports & Sharing
"""
import io
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path

# Try to import reportlab, fall back to basic HTML if not available
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        PageBreak, Image, HRFlowable
    )
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


class ReportService:
    """
    Report generation service for creating PDF documents.
    """

    def __init__(self):
        self.styles = None
        if REPORTLAB_AVAILABLE:
            self._setup_styles()

    def _setup_styles(self):
        """Set up custom paragraph styles."""
        self.styles = getSampleStyleSheet()

        # Title style
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#4A148C'),
            alignment=TA_CENTER,
            spaceAfter=30,
        ))

        # Subtitle style
        self.styles.add(ParagraphStyle(
            name='ReportSubtitle',
            parent=self.styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor('#7B1FA2'),
            alignment=TA_CENTER,
            spaceAfter=20,
        ))

        # Section header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#6A1B9A'),
            spaceBefore=20,
            spaceAfter=10,
        ))

        # Body text style
        self.styles.add(ParagraphStyle(
            name='BodyText',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#333333'),
            alignment=TA_JUSTIFY,
            spaceAfter=8,
            leading=14,
        ))

        # Table header style
        self.styles.add(ParagraphStyle(
            name='TableHeader',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.white,
            alignment=TA_CENTER,
        ))

    def generate_birth_chart_report(
        self,
        chart_data: Dict[str, Any],
        birth_data: Dict[str, Any],
        interpretations: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """
        Generate a comprehensive birth chart PDF report.

        Args:
            chart_data: Calculated chart data with planets, houses, aspects
            birth_data: Birth information (name, date, location)
            interpretations: Optional AI-generated interpretations

        Returns:
            PDF document as bytes
        """
        if not REPORTLAB_AVAILABLE:
            return self._generate_fallback_report(chart_data, birth_data, interpretations)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )

        story = []

        # Title
        name = birth_data.get('name', 'Birth Chart Report')
        story.append(Paragraph(f"Birth Chart Report", self.styles['ReportTitle']))
        story.append(Paragraph(f"for {name}", self.styles['ReportSubtitle']))

        # Birth information
        story.append(self._create_birth_info_section(birth_data))
        story.append(Spacer(1, 20))

        # Planetary positions
        story.append(Paragraph("Planetary Positions", self.styles['SectionHeader']))
        story.append(self._create_planets_table(chart_data.get('planets', {})))
        story.append(Spacer(1, 20))

        # House cusps
        if chart_data.get('houses'):
            story.append(Paragraph("House Cusps", self.styles['SectionHeader']))
            story.append(self._create_houses_table(chart_data.get('houses', {})))
            story.append(Spacer(1, 20))

        # Aspects
        if chart_data.get('aspects'):
            story.append(Paragraph("Aspects", self.styles['SectionHeader']))
            story.append(self._create_aspects_table(chart_data.get('aspects', [])))
            story.append(Spacer(1, 20))

        # Interpretations
        if interpretations:
            story.append(PageBreak())
            story.append(Paragraph("Interpretations", self.styles['SectionHeader']))
            story.extend(self._create_interpretations_section(interpretations))

        # Footer
        story.append(Spacer(1, 30))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E0E0E0')))
        story.append(Spacer(1, 10))
        story.append(Paragraph(
            f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
            ParagraphStyle(
                name='Footer',
                parent=self.styles['Normal'],
                fontSize=9,
                textColor=colors.gray,
                alignment=TA_CENTER
            )
        ))

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

    def _create_birth_info_section(self, birth_data: Dict) -> Table:
        """Create a table with birth information."""
        data = [
            ['Birth Date:', birth_data.get('birth_date', 'Unknown')],
            ['Birth Time:', birth_data.get('birth_time', 'Unknown')],
            ['Location:', birth_data.get('location', 'Unknown')],
            ['Coordinates:', f"{birth_data.get('latitude', 0):.4f}, {birth_data.get('longitude', 0):.4f}"],
        ]

        table = Table(data, colWidths=[1.5*inch, 4*inch])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6A1B9A')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        return table

    def _create_planets_table(self, planets: Dict) -> Table:
        """Create a table of planetary positions."""
        header = ['Planet', 'Sign', 'Degree', 'House', 'Retrograde']
        data = [header]

        for planet_name, planet_data in planets.items():
            if isinstance(planet_data, dict):
                row = [
                    planet_name.replace('_', ' ').title(),
                    planet_data.get('sign', 'Unknown'),
                    f"{planet_data.get('degree', 0):.2f}°",
                    str(planet_data.get('house', '-')),
                    'Rx' if planet_data.get('retrograde', False) else ''
                ]
                data.append(row)

        table = Table(data, colWidths=[1.3*inch, 1.2*inch, 1*inch, 0.8*inch, 1*inch])
        table.setStyle(TableStyle([
            # Header style
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6A1B9A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            # Body style
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        return table

    def _create_houses_table(self, houses: Dict) -> Table:
        """Create a table of house cusps."""
        header = ['House', 'Sign', 'Degree']
        data = [header]

        for house_num in range(1, 13):
            house_key = str(house_num)
            house_data = houses.get(house_key, houses.get(house_num, {}))
            if isinstance(house_data, dict):
                row = [
                    f"House {house_num}",
                    house_data.get('sign', 'Unknown'),
                    f"{house_data.get('degree', 0):.2f}°"
                ]
                data.append(row)

        table = Table(data, colWidths=[1.5*inch, 1.5*inch, 1.2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6A1B9A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        return table

    def _create_aspects_table(self, aspects: List) -> Table:
        """Create a table of aspects."""
        header = ['Planet 1', 'Aspect', 'Planet 2', 'Orb']
        data = [header]

        for aspect in aspects[:20]:  # Limit to 20 aspects
            if isinstance(aspect, dict):
                row = [
                    aspect.get('planet1', 'Unknown').replace('_', ' ').title(),
                    aspect.get('aspect_name', aspect.get('type', 'Unknown')),
                    aspect.get('planet2', 'Unknown').replace('_', ' ').title(),
                    f"{aspect.get('orb', 0):.2f}°"
                ]
                data.append(row)

        table = Table(data, colWidths=[1.3*inch, 1.3*inch, 1.3*inch, 0.8*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6A1B9A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        return table

    def _create_interpretations_section(self, interpretations: Dict) -> List:
        """Create paragraphs for interpretations."""
        elements = []

        for key, value in interpretations.items():
            if isinstance(value, str) and value.strip():
                # Section title
                title = key.replace('_', ' ').title()
                elements.append(Paragraph(title, self.styles['SectionHeader']))
                elements.append(Paragraph(value, self.styles['BodyText']))
                elements.append(Spacer(1, 15))
            elif isinstance(value, dict):
                # Nested interpretations
                for sub_key, sub_value in value.items():
                    if isinstance(sub_value, str) and sub_value.strip():
                        sub_title = f"{key.replace('_', ' ').title()} - {sub_key.replace('_', ' ').title()}"
                        elements.append(Paragraph(sub_title, self.styles['SectionHeader']))
                        elements.append(Paragraph(sub_value, self.styles['BodyText']))
                        elements.append(Spacer(1, 10))

        return elements

    def _generate_fallback_report(
        self,
        chart_data: Dict,
        birth_data: Dict,
        interpretations: Optional[Dict]
    ) -> bytes:
        """Generate a simple text-based report when ReportLab is not available."""
        lines = []
        lines.append("=" * 60)
        lines.append("BIRTH CHART REPORT")
        lines.append("=" * 60)
        lines.append("")
        lines.append(f"Name: {birth_data.get('name', 'Unknown')}")
        lines.append(f"Date: {birth_data.get('birth_date', 'Unknown')}")
        lines.append(f"Time: {birth_data.get('birth_time', 'Unknown')}")
        lines.append(f"Location: {birth_data.get('location', 'Unknown')}")
        lines.append("")
        lines.append("-" * 60)
        lines.append("PLANETARY POSITIONS")
        lines.append("-" * 60)

        for planet_name, planet_data in chart_data.get('planets', {}).items():
            if isinstance(planet_data, dict):
                rx = ' Rx' if planet_data.get('retrograde') else ''
                lines.append(
                    f"{planet_name.title():15} {planet_data.get('sign', ''):12} "
                    f"{planet_data.get('degree', 0):6.2f}° House {planet_data.get('house', '-')}{rx}"
                )

        lines.append("")
        lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        lines.append("=" * 60)

        return '\n'.join(lines).encode('utf-8')

    def generate_transit_report(
        self,
        transits: List[Dict],
        birth_data: Dict[str, Any],
        forecast: Optional[str] = None
    ) -> bytes:
        """Generate a transit report PDF."""
        if not REPORTLAB_AVAILABLE:
            return self._generate_fallback_transit_report(transits, birth_data, forecast)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )

        story = []

        # Title
        name = birth_data.get('name', 'Transit Report')
        story.append(Paragraph("Transit Report", self.styles['ReportTitle']))
        story.append(Paragraph(f"for {name}", self.styles['ReportSubtitle']))
        story.append(Paragraph(
            f"as of {datetime.now().strftime('%B %d, %Y')}",
            self.styles['ReportSubtitle']
        ))
        story.append(Spacer(1, 20))

        # Active transits
        story.append(Paragraph("Active Transits", self.styles['SectionHeader']))
        story.append(self._create_transits_table(transits))
        story.append(Spacer(1, 20))

        # Forecast
        if forecast:
            story.append(Paragraph("Transit Forecast", self.styles['SectionHeader']))
            story.append(Paragraph(forecast, self.styles['BodyText']))

        # Footer
        story.append(Spacer(1, 30))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E0E0E0')))
        story.append(Paragraph(
            f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
            ParagraphStyle(
                name='Footer',
                parent=self.styles['Normal'],
                fontSize=9,
                textColor=colors.gray,
                alignment=TA_CENTER
            )
        ))

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

    def _create_transits_table(self, transits: List[Dict]) -> Table:
        """Create a table of transits."""
        header = ['Transit Planet', 'Aspect', 'Natal Planet', 'Orb', 'Exact Date']
        data = [header]

        for transit in transits[:15]:
            if isinstance(transit, dict):
                row = [
                    transit.get('transiting_planet', 'Unknown').replace('_', ' ').title(),
                    transit.get('aspect_name', 'Unknown'),
                    transit.get('natal_planet', 'Unknown').replace('_', ' ').title(),
                    f"{transit.get('orb', 0):.2f}°",
                    transit.get('exact_date', '-')
                ]
                data.append(row)

        table = Table(data, colWidths=[1.3*inch, 1.1*inch, 1.3*inch, 0.7*inch, 1.1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1565C0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
        ]))
        return table

    def _generate_fallback_transit_report(
        self,
        transits: List[Dict],
        birth_data: Dict,
        forecast: Optional[str]
    ) -> bytes:
        """Generate a simple text transit report."""
        lines = []
        lines.append("=" * 60)
        lines.append("TRANSIT REPORT")
        lines.append("=" * 60)
        lines.append(f"For: {birth_data.get('name', 'Unknown')}")
        lines.append(f"Date: {datetime.now().strftime('%Y-%m-%d')}")
        lines.append("")

        for transit in transits:
            lines.append(
                f"{transit.get('transiting_planet', ''):12} "
                f"{transit.get('aspect_name', ''):12} "
                f"{transit.get('natal_planet', ''):12}"
            )

        if forecast:
            lines.append("")
            lines.append("FORECAST:")
            lines.append(forecast)

        return '\n'.join(lines).encode('utf-8')


# Singleton instance
_report_service = None


def get_report_service() -> ReportService:
    """Get the singleton ReportService instance."""
    global _report_service
    if _report_service is None:
        _report_service = ReportService()
    return _report_service
