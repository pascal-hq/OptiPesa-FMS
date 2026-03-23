import base64
import requests
from datetime import datetime
from django.conf import settings


def get_mpesa_access_token():
    """
    Get OAuth access token from Safaricom Daraja.
    """
    env = getattr(settings, "MPESA_ENV", "sandbox")
    if env == "production":
        url = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    else:
        url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"

    consumer_key = settings.MPESA_CONSUMER_KEY
    consumer_secret = settings.MPESA_CONSUMER_SECRET

    response = requests.get(url, auth=(consumer_key, consumer_secret))
    response.raise_for_status()
    data = response.json()
    return data["access_token"]


def generate_mpesa_password():
    """
    Generate base64 password: Shortcode + Passkey + Timestamp.
    """
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    data_to_encode = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
    encoded = base64.b64encode(data_to_encode.encode("utf-8")).decode("utf-8")
    return encoded, timestamp


def initiate_stk_push(phone_number: str, amount: int, account_reference: str = "OptiPesa", description: str = "Payment"):
    """
    Call M-Pesa STK Push API.
    """
    env = getattr(settings, "MPESA_ENV", "sandbox")
    if env == "production":
        url = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    else:
        url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"

    access_token = get_mpesa_access_token()
    password, timestamp = generate_mpesa_password()

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": phone_number,              # Customer phone
        "PartyB": settings.MPESA_SHORTCODE,  # Till/Paybill
        "PhoneNumber": phone_number,
        "CallBackURL": settings.MPESA_STK_PUSH_CALLBACK_URL,
        "AccountReference": account_reference,
        "TransactionDesc": description,
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()