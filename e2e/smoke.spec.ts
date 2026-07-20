// 전 모듈 스모크 E2E: 가입→회사→품목/거래처→구매 확정→판매 확정→회계 확인
// 전제: Supabase Auth의 이메일 확인(Confirm email) off. 로컬에서 실행: npm run test:e2e
import { test, expect } from "@playwright/test";

const email = `smoke-${Date.now()}@test-erp.dev`;
const password = "test123456";

test.describe.serial("전 모듈 스모크", () => {
  test("가입과 회사 생성", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("이메일").fill(email);
    await page.getByLabel("비밀번호").fill(password);
    await page.getByRole("button", { name: "회원가입" }).click();
    await page.waitForURL(/\/(onboarding)?$/, { timeout: 15_000 });
    if (!page.url().includes("onboarding")) await page.goto("/onboarding");
    await page.getByLabel("회사명").fill("스모크 주식회사");
    await page.getByRole("button", { name: "회사 생성" }).click();
    await page.waitForURL("/");
  });

  test("기준정보: 품목·거래처 등록", async ({ page }) => {
    await login(page);
    await page.goto("/master/items");
    await fillByLabel(page, "품목코드", "SM-1");
    await fillByLabel(page, "품목명", "스모크상품");
    await fillByLabel(page, "입고단가", "1000");
    await fillByLabel(page, "출고단가", "2000");
    await page.getByRole("button", { name: "등록", exact: true }).click();
    await expect(page.getByText("SM-1")).toBeVisible();

    await page.goto("/master/partners");
    await fillByLabel(page, "코드", "SM-P1");
    await fillByLabel(page, "상호", "스모크거래처");
    await page.getByRole("button", { name: "등록", exact: true }).click();
    await expect(page.getByText("스모크거래처")).toBeVisible();
  });

  test("구매 확정 → 재고 입고", async ({ page }) => {
    await login(page);
    await page.goto("/purchasing");
    await page.getByRole("button", { name: "신규 작성" }).click();
    await page.getByLabel("거래처").selectOption({ label: "[SM-P1] 스모크거래처" });
    await page.getByLabel("입고 창고").selectOption({ index: 1 });
    await page.locator("tbody select").first().selectOption({ label: "[SM-1] 스모크상품" });
    await page.locator('tbody input[type="number"]').first().fill("20");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "확정" }).first().click();
    await page.goto("/inventory");
    await expect(page.getByText("20")).toBeVisible();
  });

  test("판매 확정 → 회계 반영", async ({ page }) => {
    await login(page);
    await page.goto("/sales");
    await page.getByRole("button", { name: "신규 작성" }).click();
    await page.getByLabel("거래처").selectOption({ label: "[SM-P1] 스모크거래처" });
    await page.getByLabel("출고 창고").selectOption({ index: 1 });
    await page.locator("tbody select").first().selectOption({ label: "[SM-1] 스모크상품" });
    await page.locator('tbody input[type="number"]').first().fill("5");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "확정" }).first().click();

    await page.goto("/accounting");
    await expect(page.getByText("판매").first()).toBeVisible();
    await page.goto("/accounting/reports");
    await expect(page.getByText("합계잔액시산표", { exact: false })).toBeVisible();
    // 차대 불일치 경고가 없어야 한다
    await expect(page.getByText("일치하지 않습니다")).toHaveCount(0);
  });
});

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL("/");
}

async function fillByLabel(
  page: import("@playwright/test").Page,
  label: string,
  value: string
) {
  await page.getByLabel(label, { exact: true }).fill(value);
}
