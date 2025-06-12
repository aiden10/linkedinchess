import time
import json
import os
import smtplib
import ssl
from email.message import EmailMessage
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from dotenv import load_dotenv
from time import gmtime, strftime

def send_email():
    load_dotenv()
    subject = "LinkedIn Chess Verification Required"
    body = "Connect to the server and run verify.py"
    sender = 'aiden.ten30@gmail.com'
    password = os.getenv('EMAIL_PASSWORD')
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=context) as smtp:
        recipient = 'aiden.ten30@gmail.com'
        em = EmailMessage()
        em['From'] = sender
        em['To'] = recipient
        em['Subject'] = subject
        em.set_content(body)
        smtp.login(sender, password)

        try:
            smtp.sendmail(sender, recipient, em.as_string())
            print(f'email sent to {recipient}')
        except Exception as e:
            print(f'Error sending email to {recipient}: {e}')

def update_cookies():
    current_time = strftime("%Y-%m-%d %H:%M:%S", gmtime())
    print(f'{current_time} | update_cookies() started')
    try:
        load_dotenv()
        email = os.getenv('LINKEDIN_EMAIL')
        password = os.getenv('LINKEDIN_PASSWORD')
        current_time = strftime("%Y-%m-%d %H:%M:%S", gmtime())
        print(f'{current_time} | environment variables loaded')
        chrome_options = Options()
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-setuid-sandbox')
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--disable-gpu')

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
        verify = driver.find_elements(By.ID, 'input__email_verification_pin')
        if len(verify) != 0:
            send_email()
            return

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
        print(f"{current_time} | An error occurred in update_cookies: {e}")
    finally:
        driver.quit()

def check_cookies():
    current_time = strftime("%Y-%m-%d %H:%M:%S", gmtime())
    print(f'{current_time} | check_cookies() started')

    try:
        with open('cookies.json', "r", encoding="utf-8") as cookies_file:
            cookies_json = json.load(cookies_file)

        current_time = strftime("%Y-%m-%d %H:%M:%S", gmtime())
        print(f'{current_time} | cookie file loaded')

        chrome_options = Options()
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-setuid-sandbox')
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--disable-gpu')

        driver = webdriver.Chrome(options=chrome_options)
        current_time = strftime("%Y-%m-%d %H:%M:%S", gmtime())
        print(f'{current_time} | chromium started')

        driver.get('https://www.linkedin.com')

        for cookie in cookies_json:
            driver.add_cookie(cookie)

        driver.refresh()
        driver.implicitly_wait(10)
        page_url = driver.current_url
        if 'feed' not in page_url:
            status = "false"
        else:
            status = "true"

        with open('cookieStatus.json', "w") as cookie_status_file:
            json.dump({"status": status}, cookie_status_file)

        current_time = strftime("%Y-%m-%d %H:%M:%S", gmtime())
        print(f'{current_time} | updated cookie status to {status}')

    except FileNotFoundError as fnfe:
        print(f"Cookie file not found: {fnfe}")
        status = "false"
    except Exception as e:
        current_time = strftime("%Y-%m-%d %H:%M:%S", gmtime())
        print(f"{current_time} | An error occurred in check_cookies: {e}")
        status = "false"
    finally:
        driver.quit()

    return status == "true"

current_time = strftime("%Y-%m-%d %H:%M:%S", gmtime())
print(f'{current_time} | cookie_check.py started')
while True:
    try:
        cookie_status = check_cookies()
        if not cookie_status:
            current_time = strftime("%Y-%m-%d %H:%M:%S", gmtime())
            print(f"{current_time} | cookies currently invalid, attempting to update cookies...")
            update_cookies()
    except Exception as e:
        current_time = strftime("%Y-%m-%d %H:%M:%S", gmtime())
        print(f"{current_time} | An error occurred in the main loop: {e}")

    time.sleep(28800)  # every 8 hours