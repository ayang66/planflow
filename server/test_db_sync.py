import psycopg2

try:
    conn = psycopg2.connect(
        host='aws-1-ap-northeast-1.pooler.supabase.com',
        port=6543,
        user='postgres.uohcwutaxzxthkokqsbt',
        password='#Lhy020312lhy',
        database='postgres'
    )
    print('✅ 连接成功!')
    
    cur = conn.cursor()
    cur.execute('SELECT version();')
    print(f'数据库版本: {cur.fetchone()[0]}')
    
    cur.execute('SELECT current_database();')
    print(f'当前数据库: {cur.fetchone()[0]}')
    
    cur.close()
    conn.close()
except Exception as e:
    print(f'❌ 连接失败: {type(e).__name__}: {e}')