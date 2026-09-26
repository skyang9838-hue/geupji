import { describe, expect, it } from "vitest";
import { withJosa } from "./josa";

describe("withJosa", () => {
  it("uses 과 after a final consonant", () => {
    expect(withJosa("잠실", "과/와")).toBe("잠실과");
  });

  it("uses 와 after an open syllable", () => {
    expect(withJosa("마포", "과/와")).toBe("마포와");
  });

  it("handles 은/는 and 이/가 the same way", () => {
    expect(withJosa("동탄", "은/는")).toBe("동탄은");
    expect(withJosa("송도", "이/가")).toBe("송도가");
  });

  it("treats a trailing non-Hangul character as open", () => {
    expect(withJosa("A", "과/와")).toBe("A와");
  });
});
