import time
import json
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from dotenv import load_dotenv
from time import gmtime, strftime

def verifyLogin():
    current_time = strftime("%Y-%m-%d %H:%M:%S", gmtime())
    print(f'{current_time} | verifyLogin() started')
    try:
        load_dotenv()
        email = os.getenv('LINKEDIN_EMAIL')
        password = os.getenv('LINKEDIN_PASSWORD')
        current_time = strftime("%Y-%m-%d %H:%M:%S", gmtime())
        print(f'{current_time} | environment variables loaded')
        # Set up Chromium options
        chrome_options = Options()
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-setuid-sandbox')
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--disable-gpu')

        # Start Chromium driver
        driver = webdriver.Chrome(options=chrome_options)
        current_time = strftime("%Y-%m-%d %H:%M:%S", gmtime())
        print(f'{current_time} | chromium started')

        driver.get('https://www.linkedin.com/login')
        driver.implicitly_wait(10)

        email_field = driver.find_element(By.ID, "username")
        password_field = driver.find_element(By.ID, "password")
        email_field.send_keys(email)
        password_field.send_keys(password)
        password_field.submit()

        WebDriverWait(driver, 15).until(EC.url_changes('https://www.linkedin.com/login'))
        print(driver.page_source)
        code_field = driver.find_element(By.ID, 'input__email_verification_pin')
        code = input("enter email verification code: ")
        code_field.send_keys(code)
        code_field.submit()

        if driver.current_url != 'https://www.linkedin.com/login':
            cookies = driver.get_cookies()
            with open('cookies.json', 'w', encoding='utf-8') as cookies_file:
                json.dump(cookies, cookies_file)

            current_time = strftime("%Y-%m-%d %H:%M:%S", gmtime())
            print(f'{current_time} | cookies successfully updated')
            with open('cookieStatus.json', "w") as cookie_status_file:
                json.dump({"status": "true"}, cookie_status_file)

        else:
            current_time = strftime("%Y-%m-%d %H:%M:%S", gmtime())
            print(f'{current_time} | failed to login')

    except Exception as e:
        current_time = strftime("%Y-%m-%d %H:%M:%S", gmtime())
        print(f"{current_time} | An error occurred in updateCookies: {e}")
    finally:
        driver.quit()

verifyLogin()