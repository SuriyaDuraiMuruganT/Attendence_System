import ipaddress
from typing import List, Optional
from fastapi import Request
from app.config import settings

def extract_client_ip(request: Request) -> str:
    """
    Extract the real client IP address securely.
    Supports reverse proxies (Render, Railway, Vercel, Cloudflare, Nginx)
    by evaluating X-Forwarded-For when incoming peer is trusted.
    """
    peer_ip = request.client.host if request.client else "127.0.0.1"

    forwarded_for = request.headers.get("x-forwarded-for")
    cf_connecting_ip = request.headers.get("cf-connecting-ip")
    x_real_ip = request.headers.get("x-real-ip")

    # Cloudflare direct header priority if configured
    if cf_connecting_ip:
        return cf_connecting_ip.strip()

    if forwarded_for:
        # X-Forwarded-For can be a comma-separated list: client, proxy1, proxy2
        ips = [ip.strip() for ip in forwarded_for.split(",") if ip.strip()]
        if ips:
            # First IP in X-Forwarded-For is the original client
            return ips[0]

    if x_real_ip:
        return x_real_ip.strip()

    return peer_ip

def is_ip_allowed(client_ip_str: str, allowed_rules: List[str]) -> bool:
    """
    Checks if client_ip falls within any allowed IP or CIDR network.
    """
    if not client_ip_str:
        return False
        
    try:
        client_ip = ipaddress.ip_address(client_ip_str)
    except ValueError:
        return False

    for rule in allowed_rules:
        rule = rule.strip()
        if not rule:
            continue
        try:
            # Handles both single IP '192.168.1.1' and CIDR '192.168.1.0/24'
            network = ipaddress.ip_network(rule, strict=False)
            if client_ip in network:
                return True
        except ValueError:
            continue

    return False

