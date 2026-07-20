// 가입 → 회사 생성 → 대시보드 진입까지의 핵심 인증 흐름 E2E
// 전제: Supabase Auth의 이메일 확인(Confirm email)이 꺼져 있어야 가입 직후 세션이 생긴다
import { test, expect } from "@playwright/test";

const email = `e2e-${Date.now()}@test-erp.dev`;
const password = "test123456";

test("미인증 사용자는 /login으로 리다이렉트된다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "ERP System" })).toBeVisible();
});

test("가입 → 회사 생성 → 대시보드", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "회원가입" }).click();

  // 이메일 확인이 꺼져 있으면 온보딩으로 이동한다
  await page.waitForURL(/\/(onboarding)?$/, { timeout: 15_000 });
  if (!page.url().includes("onboarding")) await page.goto("/onboarding");

  await page.getByLabel("회사명").fill("E2E 테스트 회사");
  await page.getByRole("button", { name: "회사 생성" }).click();

  await page.waitForURL("/");
  await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
  await expect(page.getByText("E2E 테스트 회사")).toBeVisible();
});

test("로그아웃 후 다시 로그인할 수 있다", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL("/");

  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login/);
});
