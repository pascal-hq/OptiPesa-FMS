from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = "Create a superuser if none exists"

    def handle(self, *args, **kwargs):
        if not User.objects.filter(username="Pascal").exists():
            User.objects.create_superuser(
                username="Pascal",
                email="",
                password="Muthama@001",
                role="admin"
            )
            self.stdout.write("Superuser created successfully.")
        else:
            self.stdout.write("Superuser already exists.")