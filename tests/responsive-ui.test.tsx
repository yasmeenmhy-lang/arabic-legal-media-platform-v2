import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable, Panel } from "@/components/ui";

const devices = [
  { name: "iPhone 13", width: 390, height: 844 },
  { name: "iPhone 14 Pro", width: 393, height: 852 },
  { name: "Galaxy S23", width: 360, height: 780 },
  { name: "iPad", width: 768, height: 1024 }
];

const longArabicText =
  "هذه ملاحظة طويلة لاختبار التفاف النص العربي داخل البطاقات والجداول دون إنشاء تمرير أفقي أو قص المحتوى، مع عرض المرجع النظامي والتوصية كاملة داخل حدود الشاشة.";

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
  window.dispatchEvent(new Event("resize"));
}

describe("responsive layout primitives", () => {
  it.each(devices)("keeps tables responsive for $name", ({ width, height }) => {
    setViewport(width, height);

    const { container } = render(
      <DataTable
        headers={["الملاحظة", "المرجع النظامي", "الشرح القانوني", "التوصية"]}
        rows={[[longArabicText, "القاعدة السادسة عشرة، الفقرة (3)", longArabicText, longArabicText]]}
      />
    );

    expect(screen.getAllByText("الملاحظة").length).toBeGreaterThan(0);
    expect(screen.getAllByText(longArabicText).length).toBeGreaterThan(0);
    expect(container.querySelector(".overflow-x-auto")).toBeNull();
    expect(container.querySelector(".min-w-\\[720px\\]")).toBeNull();
    expect(container.querySelectorAll("article").length).toBeGreaterThan(0);
  });

  it("uses bounded cards for long Arabic content", () => {
    const { container } = render(
      <Panel>
        <p>{longArabicText}</p>
      </Panel>
    );

    const panel = container.querySelector("section");
    expect(panel?.className).toContain("w-full");
    expect(panel?.className).toContain("max-w-full");
    expect(panel?.className).toContain("overflow-hidden");
  });
});
