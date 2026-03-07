import io
import datetime
from django.http import HttpResponse, FileResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from core.authentication import FirebaseAuthentication
from finance.models import Transaction
from crm.models import Deal
from inventory.models import StockMovement
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import openpyxl

class BaseReportView(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def get_date_range(self, request):
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        start_date = None
        end_date = None
        
        if start_date_str:
            try:
                start_date = datetime.datetime.strptime(start_date_str, "%Y-%m-%d").date()
            except ValueError:
                pass
                
        if end_date_str:
            try:
                end_date = datetime.datetime.strptime(end_date_str, "%Y-%m-%d").date()
            except ValueError:
                pass
                
        return start_date, end_date

    def generate_excel(self, headers, data, filename):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Report"
        
        ws.append(headers)
        for row in data:
            ws.append(row)
            
        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        
        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}.xlsx"'
        return response

    def generate_pdf(self, title, headers, data, filename):
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, 750, title)
        
        p.setFont("Helvetica-Bold", 10)
        y = 720
        
        # Simple column width calculation
        col_width = 500 / max(len(headers), 1)
        x_offsets = [50 + i * col_width for i in range(len(headers))]
        
        for i, header in enumerate(headers):
            p.drawString(x_offsets[i], y, str(header))
            
        p.setFont("Helvetica", 10)
        y -= 20
        
        for row in data:
            if y < 50:
                p.showPage()
                p.setFont("Helvetica", 10)
                y = 750
            for i, item in enumerate(row):
                # Formatar datas se for o caso
                str_item = str(item)
                if isinstance(item, datetime.date):
                    str_item = item.strftime("%Y-%m-%d")
                elif isinstance(item, float):
                    str_item = f"{item:.2f}"
                p.drawString(x_offsets[i], y, str_item[:25]) # Trucar longo
            y -= 20
            
        p.save()
        buffer.seek(0)
        
        return FileResponse(buffer, as_attachment=True, filename=f"{filename}.pdf")


class FinanceReportView(BaseReportView):
    def get(self, request):
        start_date, end_date = self.get_date_range(request)
        fmt = request.query_params.get('format', 'pdf')
        
        qs = Transaction.objects.filter(user=request.user)
        if start_date:
            qs = qs.filter(payment_date__gte=start_date)
        if end_date:
            qs = qs.filter(payment_date__lte=end_date)
            
        headers = ["Data", "Título", "Tipo", "Valor", "Status"]
        data = [[t.payment_date or t.due_date, t.title, t.get_type_display(), float(t.value), t.get_status_display()] for t in qs]
        
        if fmt == 'excel':
            return self.generate_excel(headers, data, "finance_report")
        return self.generate_pdf("Relatório Financeiro", headers, data, "finance_report")


class SalesReportView(BaseReportView):
    def get(self, request):
        start_date, end_date = self.get_date_range(request)
        fmt = request.query_params.get('format', 'pdf')
        
        qs = Deal.objects.filter(user=request.user)
        if start_date:
            qs = qs.filter(created_at__date__gte=start_date) 
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)
            
        headers = ["Nome", "Valor", "Status", "Data Criação"]
        data = [[d.name, float(d.value), d.status, d.created_at.strftime("%Y-%m-%d")] for d in qs]
        
        if fmt == 'excel':
            return self.generate_excel(headers, data, "sales_report")
        return self.generate_pdf("Relatório de Vendas", headers, data, "sales_report")


class InventoryReportView(BaseReportView):
    def get(self, request):
        start_date, end_date = self.get_date_range(request)
        fmt = request.query_params.get('format', 'pdf')
        
        qs = StockMovement.objects.filter(user=request.user)
        if start_date:
            qs = qs.filter(date__date__gte=start_date)
        if end_date:
            qs = qs.filter(date__date__lte=end_date)
            
        headers = ["Data", "Produto", "Tipo", "Qtd"]
        data = [[m.date.strftime("%Y-%m-%d"), m.product.name, m.get_type_display(), float(m.quantity)] for m in qs]
        
        if fmt == 'excel':
            return self.generate_excel(headers, data, "inventory_report")
        return self.generate_pdf("Relatório de Estoque", headers, data, "inventory_report")
