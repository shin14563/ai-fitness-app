from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    print("Navigating to / (should redirect to /login)")
    page.goto('http://localhost:3000')
    page.wait_for_load_state('networkidle')
    print("Current URL:", page.url)

    print("Navigating to /register?token=test-token-123")
    page.goto('http://localhost:3000/register?token=test-token-123')
    page.wait_for_load_state('networkidle')
    
    print("Filling registration form")
    import time
    test_email = f"test_{int(time.time())}@example.com"
    page.fill('input[name="displayName"]', 'Test User')
    page.fill('input[name="email"]', test_email)
    page.fill('input[name="password"]', 'password123')
    
    print("Submitting form")
    page.click('button')
    page.wait_for_load_state('networkidle')
    
    print("Post-registration URL:", page.url)

    print("Testing sign out")
    try:
        page.click('button:has-text("Sign out")')
        page.wait_for_load_state('networkidle')
        print("Post-signout URL:", page.url)
    except Exception as e:
        print("Sign out failed or button not found:", e)

    browser.close()
