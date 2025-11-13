#!/usr/bin/env python3
"""
generate_receipt.py

Small CLI utility to generate a professional receipt PDF using ReportLab.
Usage:
  python generate_receipt.py --json data.json --out receipt.pdf
  python generate_receipt.py --json '{"receiptId":"AL-1-1234", "studentName":"Alice", ... }' --out out.pdf

This does not replace the existing browser PDF flow; it provides an optional server-side
high-quality PDF generator that uses consistent margins, typography and spacing.
"""
import json
import argparse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER


def build_story(data):
    styles = getSampleStyleSheet()
    story = []

    # Custom styles
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], alignment=TA_CENTER, fontSize=18, leading=20)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], alignment=TA_CENTER, fontSize=10, textColor=colors.HexColor('#666666'))
    label_style = ParagraphStyle('Label', parent=styles['Normal'], fontSize=8.5, textColor=colors.HexColor('#666666'), leading=10)
    value_style = ParagraphStyle('Value', parent=styles['Normal'], fontSize=12, leading=14)

    # Header
    story.append(Paragraph('RECEIPT', title_style))
    story.append(Paragraph('Aspirant Library', subtitle_style))
    story.append(Spacer(1, 8))

    # Meta table (receipt id, issued)
    meta_table_data = [
        [Paragraph('<b>Receipt ID</b>', label_style), Paragraph(data.get('receiptId', '—'), value_style), '', Paragraph('<b>Issued</b>', label_style), Paragraph(data.get('issuedAt', '—'), value_style)]
    ]
    meta_table = Table(meta_table_data, colWidths=[40*mm, 55*mm, 8*mm, 25*mm, 50*mm])
    meta_table.setStyle(TableStyle([
        ('SPAN', (0,0), (1,0)),
        ('SPAN', (3,0), (4,0)),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # Fields table - two columns label/value rows
    rows = []
    def row(label, field):
        return [Paragraph(f'<b>{label}</b>', label_style), Paragraph(field or '—', value_style)]

    rows.append(row('Student Name', data.get('studentName')))
    rows.append(row('Seat Number', str(data.get('seatNumber') or '—')))
    rows.append(row('Plan', data.get('plan')))
    rows.append(row('Amount Paid', data.get('amount') is not None and f"₹{data.get('amount'):,}" or '—'))
    rows.append(row('Start Date', data.get('startDate')))
    rows.append(row('End Date', data.get('endDate')))

    fields_table = Table(rows, colWidths=[60*mm, 100*mm], hAlign='LEFT')
    fields_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('LINEBEFORE', (0,0), (0,-1), 0.25, colors.HexColor('#eeeeee')),
    ]))
    story.append(fields_table)
    story.append(Spacer(1, 12))

    # Contact
    story.append(Paragraph('<b>Contact</b>', label_style))
    story.append(Paragraph(data.get('phoneNumber') or '—', value_style))
    story.append(Spacer(1, 16))

    # Footer
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, textColor=colors.HexColor('#777777'))
    story.append(Paragraph('Please retain this receipt for record and entry verification.', footer_style))
    story.append(Paragraph('Digitally issued by Aspirant Library Seat Manager', footer_style))

    return story


def generate_pdf(data, out_path):
    doc = SimpleDocTemplate(out_path, pagesize=A4,
                            rightMargin=18*mm, leftMargin=18*mm,
                            topMargin=18*mm, bottomMargin=18*mm)
    story = build_story(data)
    doc.build(story)


def load_json_input(json_arg):
    # If json_arg looks like a file path, load it; otherwise parse as JSON string
    try:
        with open(json_arg, 'r', encoding='utf-8') as fh:
            return json.load(fh)
    except FileNotFoundError:
        return json.loads(json_arg)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--json', required=True, help='JSON payload or path to JSON file')
    parser.add_argument('--out', required=True, help='Output PDF path')
    args = parser.parse_args()

    data = load_json_input(args.json)
    generate_pdf(data, args.out)
    print(f'Wrote receipt to {args.out}')


if __name__ == '__main__':
    main()
