import requests
from django.conf import settings


def mpesa_base_url():
    return "https://sandbox.safaricom.co.ke" if settings.MPESA_ENV == "sandbox" else "https://api.safaricom.co.ke"


def get_access_token():
    url = f"{mpesa_base_url()}/oauth/v1/generate?grant_type=client_credentials"
    r = requests.get(url, auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET), timeout=30)
    r.raise_for_status()
    return r.json()
