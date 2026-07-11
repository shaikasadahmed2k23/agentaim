"""
Real Ed25519 cryptography — no mocked trust scores.
Every agent gets a genuine keypair. Every attestation is a genuine
digital signature that can be independently verified.
"""
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidSignature
import base64


def generate_keypair() -> tuple[str, str]:
    """Returns (private_key_b64, public_key_b64). Private key never leaves the agent."""
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    priv_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    pub_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return (
        base64.b64encode(priv_bytes).decode(),
        base64.b64encode(pub_bytes).decode(),
    )


def sign_message(private_key_b64: str, message: str) -> str:
    """Signer uses their private key to attest to a message (e.g. another agent's public key)."""
    priv_bytes = base64.b64decode(private_key_b64)
    private_key = Ed25519PrivateKey.from_private_bytes(priv_bytes)
    signature = private_key.sign(message.encode())
    return base64.b64encode(signature).decode()


def verify_signature(public_key_b64: str, message: str, signature_b64: str) -> bool:
    """Anyone can independently verify a signature using only the signer's public key."""
    try:
        pub_bytes = base64.b64decode(public_key_b64)
        signature = base64.b64decode(signature_b64)
        public_key = Ed25519PublicKey.from_public_bytes(pub_bytes)
        public_key.verify(signature, message.encode())
        return True
    except (InvalidSignature, ValueError, Exception):
        return False


def attestation_message(signer_id: str, subject_id: str, subject_public_key: str) -> str:
    """The canonical message a signer actually signs: 'I vouch for this agent's key.'"""
    return f"ATTEST|signer={signer_id}|subject={subject_id}|key={subject_public_key}"


def randomart(public_key_b64: str) -> str:
    """
    Generates a visual key fingerprint using the drunken-bishop algorithm —
    the same technique behind `ssh-keygen -lv`, born from PGP-era crypto culture.
    A human can eyeball two fingerprints and instantly tell if two keys match,
    without comparing 44 characters of base64 by hand.
    """
    data = base64.b64decode(public_key_b64)
    W, H = 17, 9
    board = [[0] * W for _ in range(H)]
    x, y = W // 2, H // 2
    start_x, start_y = x, y
    board[y][x] += 1

    for byte in data:
        b = byte
        for _ in range(4):
            direction = b & 0x3
            b >>= 2
            if direction == 0:  # NW
                x, y = max(x - 1, 0), max(y - 1, 0)
            elif direction == 1:  # NE
                x, y = min(x + 1, W - 1), max(y - 1, 0)
            elif direction == 2:  # SW
                x, y = max(x - 1, 0), min(y + 1, H - 1)
            else:  # SE
                x, y = min(x + 1, W - 1), min(y + 1, H - 1)
            board[y][x] += 1

    end_x, end_y = x, y
    chars = " .o+=*BOX@%&#/^"
    border = "+" + "-" * W + "+"
    lines = [border]
    for yy in range(H):
        row = "|"
        for xx in range(W):
            if xx == start_x and yy == start_y:
                row += "S"
            elif xx == end_x and yy == end_y:
                row += "E"
            else:
                v = board[yy][xx]
                row += chars[v] if v < len(chars) else chars[-1]
        row += "|"
        lines.append(row)
    lines.append(border)
    return "\n".join(lines)
