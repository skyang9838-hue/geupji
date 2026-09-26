import { parseTradeResponse, type RawTradeItem } from "./parse";
import type { FetchTarget } from "./plan";

/** 국토교통부_아파트 매매 실거래가 상세 자료 (data.go.kr 15126468) */
export const ENDPOINT = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";

type FetchImpl = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface FetchOptions {
  /** The "Decoding" (plain) key; it is URL-encoded here. */
  serviceKey: string;
  fetchImpl?: FetchImpl;
  sleep?: (ms: number) => Promise<void>;
  numOfRows?: number;
  /** Extra attempts after the first for 429 / 5xx / network failures. */
  retries?: number;
}

export class TransientHttpError extends Error {}

const MAX_PAGES = 100;

/** All trades MOLIT holds for one district and contract month, across pages. */
export async function fetchMonth(target: FetchTarget, options: FetchOptions): Promise<RawTradeItem[]> {
  const numOfRows = options.numOfRows ?? 1000;
  const items: RawTradeItem[] = [];
  for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
    const page = parseTradeResponse(await requestPage(target, pageNo, numOfRows, options));
    items.push(...page.items);
    if (page.items.length === 0 || items.length >= page.totalCount) break;
  }
  return items;
}

async function requestPage(
  target: FetchTarget,
  pageNo: number,
  numOfRows: number,
  { serviceKey, fetchImpl = fetch, sleep = defaultSleep, retries = 3 }: FetchOptions,
): Promise<string> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("LAWD_CD", target.code);
  url.searchParams.set("DEAL_YMD", target.ym);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(500 * 2 ** (attempt - 1));
    try {
      const res = await fetchImpl(url);
      const body = await res.text();
      if (res.status === 429 || res.status >= 500) {
        throw new TransientHttpError(`HTTP ${res.status} for ${target.code}/${target.ym}: ${body.slice(0, 80)}`);
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${target.code}/${target.ym}: ${body.slice(0, 120)}`);
      }
      return body;
    } catch (error) {
      if (!isTransient(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

function isTransient(error: unknown): boolean {
  // TypeError is what fetch throws for network failures.
  return error instanceof TransientHttpError || error instanceof TypeError;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
