export type RoomCandidate = {
  roomTypeId: string;
  name: string;
  maxOccupancy: number;
  available: number;
  unitPrice: number;
};

export type RoomMixLine = {
  roomTypeId: string;
  name: string;
  quantity: number;
  maxOccupancy: number;
  unitPrice: number;
};

export type RoomMixSuggestion = {
  id: string;
  title: string;
  lines: RoomMixLine[];
  totalRooms: number;
  totalCapacity: number;
  totalPrice: number;
};

function lineKey(lines: RoomMixLine[]): string {
  return lines
    .map((l) => `${l.roomTypeId}x${l.quantity}`)
    .sort()
    .join('|');
}

function buildSuggestion(
  lines: RoomMixLine[],
  guests: number,
): RoomMixSuggestion | null {
  const totalRooms = lines.reduce((s, l) => s + l.quantity, 0);
  const totalCapacity = lines.reduce(
    (s, l) => s + l.quantity * l.maxOccupancy,
    0,
  );
  const totalPrice = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  if (totalCapacity < guests || totalRooms === 0) return null;

  const parts = lines.map(
    (l) => `${l.quantity}× ${l.name} (${l.maxOccupancy} khách/phòng)`,
  );

  return {
    id: lineKey(lines),
    title: parts.join(' + '),
    lines,
    totalRooms,
    totalCapacity,
    totalPrice,
  };
}

/** Gợi ý phối phòng cho số khách (client-side, dùng tồn kho + giá đã load). */
export function suggestRoomMixes(
  guests: number,
  rooms: RoomCandidate[],
  maxSuggestions = 6,
): RoomMixSuggestion[] {
  if (guests < 1) return [];

  const pool = rooms.filter((r) => r.available > 0 && r.unitPrice >= 0);
  if (!pool.length) return [];

  const seen = new Set<string>();
  const out: RoomMixSuggestion[] = [];

  const push = (lines: RoomMixLine[]) => {
    const s = buildSuggestion(lines, guests);
    if (!s || seen.has(s.id)) return;
    seen.add(s.id);
    out.push(s);
  };

  // Một loại phòng: N phòng cùng kiểu
  for (const r of pool) {
    const need = Math.ceil(guests / r.maxOccupancy);
    if (need <= r.available && need <= 8) {
      push([
        {
          roomTypeId: r.roomTypeId,
          name: r.name,
          quantity: need,
          maxOccupancy: r.maxOccupancy,
          unitPrice: r.unitPrice,
        },
      ]);
    }
  }

  // Hai loại phòng (ví dụ 2 phòng đôi + 1 phòng 3)
  for (let i = 0; i < pool.length; i++) {
    for (let j = 0; j < pool.length; j++) {
      const a = pool[i];
      const b = pool[j];
      const maxA = Math.min(a.available, 6);
      const maxB = i === j ? Math.min(b.available - 1, 6) : Math.min(b.available, 6);
      if (maxB < 0) continue;

      for (let qa = 1; qa <= maxA; qa++) {
        for (let qb = 1; qb <= maxB; qb++) {
          const cap = qa * a.maxOccupancy + qb * b.maxOccupancy;
          if (cap < guests) continue;
          const roomsUsed = qa + qb;
          if (roomsUsed > 6) continue;
          const lines: RoomMixLine[] = [
            {
              roomTypeId: a.roomTypeId,
              name: a.name,
              quantity: qa,
              maxOccupancy: a.maxOccupancy,
              unitPrice: a.unitPrice,
            },
          ];
          if (i !== j) {
            lines.push({
              roomTypeId: b.roomTypeId,
              name: b.name,
              quantity: qb,
              maxOccupancy: b.maxOccupancy,
              unitPrice: b.unitPrice,
            });
          }
          push(lines);
        }
      }
    }
  }

  out.sort((x, y) => {
    if (x.totalRooms !== y.totalRooms) return x.totalRooms - y.totalRooms;
    if (x.totalPrice !== y.totalPrice) return x.totalPrice - y.totalPrice;
    return x.totalCapacity - y.totalCapacity;
  });

  return out.slice(0, maxSuggestions);
}

export function cartCapacity(lines: RoomMixLine[]): number {
  return lines.reduce((s, l) => s + l.quantity * l.maxOccupancy, 0);
}

export function cartTotalPrice(lines: RoomMixLine[]): number {
  return lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
}

export function cartRoomCount(lines: RoomMixLine[]): number {
  return lines.reduce((s, l) => s + l.quantity, 0);
}
