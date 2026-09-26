import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MolitApiError, parseTradeResponse } from "./parse";

const fixture = (name: string) =>
  readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");

describe("parseTradeResponse", () => {
  it("returns every item as strings, with blank fields trimmed to empty", () => {
    const page = parseTradeResponse(fixture("trade-page.xml"));

    expect(page.items).toHaveLength(4);
    expect(page.items[0].aptNm).toBe("인왕산아이파크");
    expect(page.items[0].aptDong).toBe("");
    expect(page.items[0].dealAmount).toBe("115,000");
    // numeric-looking values must stay strings (leading zeros, decimals)
    expect(page.items[0].bonbun).toBe("0060");
    expect(page.items[0].excluUseAr).toBe("84.858");
  });

  it("reads the paging info", () => {
    const page = parseTradeResponse(fixture("trade-page.xml"));

    expect(page.totalCount).toBe(4);
    expect(page.pageNo).toBe(1);
    expect(page.numOfRows).toBe(1000);
  });

  it("wraps a lone item in an array", () => {
    const page = parseTradeResponse(fixture("trade-single.xml"));

    expect(page.items).toHaveLength(1);
    expect(page.items[0].aptSeq).toBe("11110-2212");
  });

  it("returns no items for a month without trades", () => {
    const page = parseTradeResponse(fixture("trade-empty.xml"));

    expect(page.items).toEqual([]);
    expect(page.totalCount).toBe(0);
  });

  it("throws MolitApiError carrying the result message when resultCode is not 000", () => {
    expect(() => parseTradeResponse(fixture("error-result.xml"))).toThrowError(
      new MolitApiError("INVALID_REQUEST_PARAMETER_ERROR", "10"),
    );
  });

  it("throws MolitApiError carrying the gateway auth message", () => {
    expect(() => parseTradeResponse(fixture("error-auth.xml"))).toThrowError(
      new MolitApiError("SERVICE_KEY_IS_NOT_REGISTERED_ERROR", "30"),
    );
  });

  it("throws MolitApiError for a body that is not XML at all", () => {
    expect(() => parseTradeResponse("Unauthorized")).toThrowError(MolitApiError);
  });
});
