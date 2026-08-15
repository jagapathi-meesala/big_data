
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import FileResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os

router = APIRouter()

def generate_pdf_report(filename):
    c = canvas.Canvas(filename, pagesize=letter)
    c.drawString(100, 750, "Disaster Resource Allocation System - Incident Report")
    c.drawString(100, 730, "Report generated automatically.")
    c.save()

@router.get("/generate")
async def get_report():
    pdf_path = "/tmp/system_report.pdf"
    generate_pdf_report(pdf_path)
    return FileResponse(pdf_path, media_type="application/pdf", filename="report.pdf")
