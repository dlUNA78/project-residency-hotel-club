from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the membership list page
        page.goto("http://localhost:3000/memberships/listMembership")

        # 2. Wait for the main heading to be visible to ensure the page has loaded
        expect(page.get_by_role("heading", name="Membresías")).to_be_visible(timeout=10000)

        # 3. Wait for the table to be populated with at least one row
        expect(page.locator("#membershipsTableBody tr")).to_have_count(1, timeout=10000)

        # 4. Take a screenshot for visual verification
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot saved to jules-scratch/verification/verification.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)