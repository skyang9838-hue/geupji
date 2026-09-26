import { describe, expect, it } from "vitest";
import { fetchPlan, monthsBetween } from "./plan";
import type { RegionDef } from "@/data/regions";

const region = (over: Partial<RegionDef>): RegionDef => ({
  slug: "x",
  name: "x",
  area: "x",
  sido: "서울",
  districts: [{ code: "11710" }],
  dongs: ["잠실동"],
  ...over,
});

describe("monthsBetween", () => {
  it("lists months inclusively across a year boundary", () => {
    expect(monthsBetween("202511", "202602")).toEqual(["202511", "202512", "202601", "202602"]);
  });
});

describe("fetchPlan", () => {
  it("fetches each code once per month even when regions share it", () => {
    const plan = fetchPlan(
      [region({ slug: "daechi", districts: [{ code: "11680" }] }), region({ slug: "gaepo", districts: [{ code: "11680" }] })],
      "202609",
      "202609",
    );

    expect(plan).toEqual([{ code: "11680", ym: "202609" }]);
  });

  it("uses the old code before a split and the new code after it", () => {
    const dongtan = region({
      districts: [
        { code: "41590", to: "202601" },
        { code: "41597", from: "202602" },
      ],
    });

    const plan = fetchPlan([dongtan], "202510", "202605", { overlapMonths: 0 });

    expect(plan.filter((p) => p.code === "41590").map((p) => p.ym)).toEqual(["202510", "202511", "202512", "202601"]);
    expect(plan.filter((p) => p.code === "41597").map((p) => p.ym)).toEqual(["202602", "202603", "202604", "202605"]);
  });

  it("asks both codes around the switch so late filings are not missed", () => {
    const dongtan = region({
      districts: [
        { code: "41590", to: "202601" },
        { code: "41597", from: "202602" },
      ],
    });

    const plan = fetchPlan([dongtan], "202512", "202603", { overlapMonths: 1 });

    expect(plan.filter((p) => p.code === "41590").map((p) => p.ym)).toEqual(["202512", "202601", "202602"]);
    expect(plan.filter((p) => p.code === "41597").map((p) => p.ym)).toEqual(["202601", "202602", "202603"]);
  });

  it("orders the plan by month, then code", () => {
    const plan = fetchPlan(
      [region({ districts: [{ code: "11710" }] }), region({ districts: [{ code: "11440" }] })],
      "202608",
      "202609",
    );

    expect(plan).toEqual([
      { code: "11440", ym: "202608" },
      { code: "11710", ym: "202608" },
      { code: "11440", ym: "202609" },
      { code: "11710", ym: "202609" },
    ]);
  });
});
