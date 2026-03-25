import re
with open('index.html', 'r', encoding='utf-8') as f: text = f.read()
text = re.sub(r'https://i\.postimg\.cc/ZRhFVktM/Photoroom-20260325-124247\.jpg', 'https://i.postimg.cc/9MmjktSC/IMG-7659.jpg', text)
with open('index.html', 'w', encoding='utf-8') as f: f.write(text)
