from playwright.sync_api import sync_playwright, TimeoutError

import os

# Credentials
ROUTER_URL = os.getenv("ROUTER_URL", "http://192.168.1.1/#/home")
PASSWORD = os.getenv("ROUTER_PASSWORD", "Java123@sql")

def check_flybox_status():
    with sync_playwright() as p:
        # Launch Chromium headless
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(ignore_https_errors=True)
        page = context.new_page()

        try:
            print("Navigating to router homepage...")
            page.goto(ROUTER_URL, timeout=60000)
            page.wait_for_timeout(3000) # Give the SPA time to render initial view

            # Handle the iframe wrapper identified in the HTML
            if page.locator('#homeOrange').count() > 0:
                ui = page.frame_locator('#homeOrange')
            else:
                ui = page

            # Step 1: Force modal visible
            print("Forcing modal visibility...")
            ui.locator('#popinAuth').evaluate("el => el.classList.remove('hidden')")

            # Step 2: Enter Password
            print("Entering credentials...")
            pass_field = ui.locator('#f_password')
            pass_field.wait_for(state="visible", timeout=5000)
            
            pass_field.fill(PASSWORD)
            ui.locator('#f_submit_login').click()
            
            print("Waiting for dashboard to load...")
            page.wait_for_timeout(2000) # Give the UI a moment to transition

            # Step 3: Navigate to Page 2 to find the Services menu
            print("Navigating to page 2...")
            next_btn = ui.locator('.btnSlide.right')
            if next_btn.is_visible():
                next_btn.click(force=True)
                page.wait_for_timeout(2000) # Increased wait time

            # Step 4: Click USSD Menu
            print("Executing #100# Menu...", flush=True)
            menu_btn = ui.locator('li[data-code="#100#"]')
            try:
                menu_btn.wait_for(timeout=5000)
                menu_btn.click(force=True)
            except Exception as e:
                print("Failed to find 'li[data-code=\"#100#\"]'. Dumping all <li> elements:", flush=True)
                count = ui.locator('li').count()
                for i in range(count):
                    try:
                        html = ui.locator('li').nth(i).evaluate("node => node.outerHTML")
                        print(f"LI {i}: {html}", flush=True)
                    except:
                        pass
                raise e

            # Step 5: Extract response
            print("Waiting for carrier response...", flush=True)
            # Hard wait to ensure USSD response arrives
            page.wait_for_timeout(10000)

            response_box = ui.locator('textarea, .el-textarea__inner').first
            if response_box.is_visible():
                response_text = response_box.input_value()
            else:
                response_text = ui.locator('#ussd .dialogue .jspPane').inner_text()

            print("\n" + "="*40)
            print("📋 USSD RESPONSE")
            print("="*40)
            print(response_text.strip())
            print("="*40 + "\n")

        except TimeoutError:
            print("Error: A step timed out. The layout might still be slightly different.")
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
        finally:
            # This is what closes Chrome. If you want it to stay open on failure to inspect the DOM, 
            # you can temporarily comment out the line below.
            browser.close()

if __name__ == "__main__":
    check_flybox_status()
