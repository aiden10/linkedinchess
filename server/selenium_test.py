from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

print('starting test')

try:
    chrome_options = Options()
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-setuid-sandbox')
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--disable-gpu')

    driver = webdriver.Chrome(service=Service('/usr/local/bin/chromedriver'), options=chrome_options)
    driver.get("https://linkedinchess.vercel.app/")
    driver.close()
    print('successfully started web driver')
    
except Exception as e:
    print(f'Failed to start chrome driver {e}')