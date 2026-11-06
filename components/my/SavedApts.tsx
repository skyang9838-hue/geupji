"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./SavedApts.module.css";

/** 관심 아파트 live in this browser only: no account, nothing sent anywhere. */
const KEY = "geupji:saved-apts";
const EVENT = "geupji:saved-apts";

export interface SavedApt {
  aptSeq: string;
  name: string;
}

function read(): SavedApt[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SavedApt[]) : [];
    return Array.isArray(list) ? list.filter((a) => a && typeof a.aptSeq === "string") : [];
  } catch {
    return [];
  }
}

function write(list: SavedApt[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // private window or blocked storage: the star just won't stick
  }
  window.dispatchEvent(new Event(EVENT));
}

function useSaved(): SavedApt[] {
  const [list, setList] = useState<SavedApt[]>([]);
  useEffect(() => {
    const sync = () => setList(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
}

export function SaveStar({ apt }: { apt: SavedApt }) {
  const list = useSaved();
  const saved = list.some((a) => a.aptSeq === apt.aptSeq);
  const toggle = () => write(saved ? list.filter((a) => a.aptSeq !== apt.aptSeq) : [...list, apt]);
  return (
    <button type="button" className={styles.star} aria-pressed={saved} onClick={toggle}>
      <span aria-hidden="true">{saved ? "★" : "☆"}</span> {saved ? "관심 아파트" : "관심 아파트에 넣기"}
    </button>
  );
}

export function SavedList({ current }: { current?: string }) {
  const list = useSaved();
  if (list.length === 0) return null;
  return (
    <nav className={styles.saved} aria-label="관심 아파트">
      <span className={styles.label}>★ 관심 아파트</span>
      <ul>
        {list.map((a) => (
          <li key={a.aptSeq}>
            <Link href={`/my?apt=${encodeURIComponent(a.aptSeq)}`} aria-current={a.aptSeq === current ? "page" : undefined}>
              {a.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
