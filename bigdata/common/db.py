"""Postgres connection helper for the RADAR serving layer.

Statement text lives inline (as literals) at each call site in the serving
and streaming modules; values are always bound through %s placeholders.
"""
import psycopg2

from config import PG


def connect_pg():
    return psycopg2.connect(
        host=PG["host"], port=PG["port"], user=PG["user"],
        password=PG["password"], dbname=PG["dbname"],
    )
