from datetime import datetime
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth, TruncDay
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from users.permissions import IsAdminOrManager
from transactions.models import Transaction
from expenses.models import Expense


def _parse_date(value):
    # expects YYYY-MM-DD
    return datetime.strptime(value, "%Y-%m-%d").date()


class AnalyticsOverviewAPIView(APIView):
    permission_classes = [IsAdminOrManager]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        sales_qs = Transaction.objects.filter(tx_type="sale", status="successful")
        expenses_qs = Expense.objects.all()

        if start_date:
            sd = _parse_date(start_date)
            sales_qs = sales_qs.filter(created_at__date__gte=sd)
            expenses_qs = expenses_qs.filter(expense_date__gte=sd)

        if end_date:
            ed = _parse_date(end_date)
            sales_qs = sales_qs.filter(created_at__date__lte=ed)
            expenses_qs = expenses_qs.filter(expense_date__lte=ed)

        total_revenue = sales_qs.aggregate(total=Sum("amount"))["total"] or 0
        total_expenses = expenses_qs.aggregate(total=Sum("amount"))["total"] or 0
        net_profit = total_revenue - total_expenses

        return Response(
            {
                "total_revenue": str(total_revenue),
                "total_expenses": str(total_expenses),
                "net_profit": str(net_profit),
                "sales_count": sales_qs.count(),
                "expense_count": expenses_qs.count(),
            },
            status=status.HTTP_200_OK
        )


class AnalyticsPerformanceAPIView(APIView):
    permission_classes = [IsAdminOrManager]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        sales_qs = Transaction.objects.filter(tx_type="sale", status="successful")

        if start_date:
            sd = _parse_date(start_date)
            sales_qs = sales_qs.filter(created_at__date__gte=sd)

        if end_date:
            ed = _parse_date(end_date)
            sales_qs = sales_qs.filter(created_at__date__lte=ed)

        dept_rev = (
            sales_qs.values("department__id", "department__name")
            .annotate(revenue=Sum("amount"), sales=Count("id"))
            .order_by("-revenue")
        )

        emp_rev = (
            sales_qs.values("employee__id", "employee__full_name", "department__name")
            .annotate(revenue=Sum("amount"), sales=Count("id"))
            .order_by("-revenue")
        )

        best_department = dept_rev[0] if dept_rev else None
        best_employee = emp_rev[0] if emp_rev else None

        return Response(
            {
                "best_department": best_department,
                "best_employee": best_employee,
                "revenue_by_department": list(dept_rev),
                "revenue_by_employee": list(emp_rev),
            },
            status=status.HTTP_200_OK
        )


class AnalyticsTrendsAPIView(APIView):
    permission_classes = [IsAdminOrManager]

    def get(self, request):
        period = request.query_params.get("period", "month")  # "day" or "month"

        sales_qs = Transaction.objects.filter(tx_type="sale", status="successful")
        expenses_qs = Expense.objects.all()

        if period == "day":
            sales_group = (
                sales_qs.annotate(p=TruncDay("created_at"))
                .values("p")
                .annotate(total=Sum("amount"))
                .order_by("p")
            )
            exp_group = (
                expenses_qs.annotate(p=TruncDay("expense_date"))
                .values("p")
                .annotate(total=Sum("amount"))
                .order_by("p")
            )
        else:
            sales_group = (
                sales_qs.annotate(p=TruncMonth("created_at"))
                .values("p")
                .annotate(total=Sum("amount"))
                .order_by("p")
            )
            exp_group = (
                expenses_qs.annotate(p=TruncMonth("expense_date"))
                .values("p")
                .annotate(total=Sum("amount"))
                .order_by("p")
            )

        sales_data = [
            {"period": str(x["p"].date() if hasattr(x["p"], "date") else x["p"]), "total": str(x["total"])}
            for x in sales_group
        ]
        exp_data = [
            {"period": str(x["p"].date() if hasattr(x["p"], "date") else x["p"]), "total": str(x["total"])}
            for x in exp_group
        ]

        return Response(
            {
                "period": period,
                "sales_trend": sales_data,
                "expenses_trend": exp_data,
            },
            status=status.HTTP_200_OK
        )
