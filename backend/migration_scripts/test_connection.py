import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5433,
    database='theprogram_db',
    user='theprogram',
    password='CHANGE_ME_TO_STRONG_PASSWORD_123!'
)
print('✓ PostgreSQL connection successful')

cursor = conn.cursor()
cursor.execute('SELECT email, full_name FROM users LIMIT 5')
print('\nUsers in database:')
for row in cursor.fetchall():
    print(f'  - {row[0]} ({row[1]})')

cursor.execute('SELECT COUNT(*) FROM clients')
print(f'\nTotal clients: {cursor.fetchone()[0]}')

cursor.execute('SELECT COUNT(*) FROM charts')
print(f'Total charts: {cursor.fetchone()[0]}')

conn.close()
