import { XMLParser } from "fast-xml-parser";

/** One <item> of the MOLIT apartment-trade response, every value kept as a trimmed string. */
export type RawTradeItem = Record<string, string>;

export interface TradePage {
  items: RawTradeItem[];
  totalCount: number;
  pageNo: number;
  numOfRows: number;
}

export class MolitApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "MolitApiError";
  }
}

const parser = new XMLParser({
  // Keep "0060", "84.858", "11110" as written — normalization decides types.
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => name === "item",
});

export function parseTradeResponse(xml: string): TradePage {
  let doc: Record<string, any>;
  try {
    doc = parser.parse(xml);
  } catch {
    throw new MolitApiError(`UNPARSEABLE_RESPONSE: ${xml.slice(0, 120)}`, "PARSE");
  }

  const gateway = doc?.OpenAPI_ServiceResponse?.cmmMsgHeader;
  if (gateway) {
    throw new MolitApiError(
      String(gateway.returnAuthMsg || gateway.errMsg || "GATEWAY_ERROR"),
      String(gateway.returnReasonCode ?? "GATEWAY"),
    );
  }

  const response = doc?.response;
  if (!response?.header) {
    throw new MolitApiError(`UNEXPECTED_RESPONSE: ${xml.slice(0, 120)}`, "UNEXPECTED");
  }

  const { resultCode, resultMsg } = response.header;
  if (String(resultCode) !== "000") {
    throw new MolitApiError(String(resultMsg || "RESULT_ERROR"), String(resultCode));
  }

  const body = response.body ?? {};
  const items: RawTradeItem[] = Array.isArray(body.items?.item)
    ? body.items.item.map(toStringRecord)
    : [];

  return {
    items,
    totalCount: toInt(body.totalCount),
    pageNo: toInt(body.pageNo),
    numOfRows: toInt(body.numOfRows),
  };
}

function toStringRecord(item: Record<string, unknown>): RawTradeItem {
  const out: RawTradeItem = {};
  for (const [key, value] of Object.entries(item ?? {})) {
    out[key] = value == null ? "" : String(value).trim();
  }
  return out;
}

function toInt(value: unknown): number {
  const n = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(n) ? n : 0;
}
