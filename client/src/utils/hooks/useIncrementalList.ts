import { useCallback, useEffect, useRef, useState } from "react";

// Uzun listeleri parça parça çizer: önce `step` satır, liste sonundaki
// gözcü (sentinel) ekrana yaklaştıkça `step` satır daha. Mobilde yüzlerce
// satırı (her biri onlarca DOM elemanı) tek seferde çizmek ana iş parçacığını
// saniyelerce kilitliyor, dokunmalar geç yanıt veriyordu.
//
// `resetKey` değişince (filtre, sayfa) baştan başlar. Veri arkada yenilendiğinde
// (refetchInterval) sıfırlanmaz: kullanıcı aşağıdayken liste kısalmasın.
export function useIncrementalList<T>(items: T[], resetKey: unknown, step = 50) {
  const [limit, setLimit] = useState(step);
  const [prevKey, setPrevKey] = useState(resetKey);
  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setLimit(step);
  }

  const hasMore = items.length > limit;
  const observer = useRef<IntersectionObserver | null>(null);

  // Callback ref: gözcü her yeniden oluştuğunda (ör. düzen değişince) yeniden bağlanır.
  const sentinelRef = useCallback(
    (el: HTMLElement | null) => {
      observer.current?.disconnect();
      if (!el || !hasMore) return;
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) setLimit((l) => l + step);
        },
        // Ekranın altına gelmeden önceden yükle: kaydırırken boşluk görünmesin.
        { rootMargin: "800px 0px" },
      );
      observer.current.observe(el);
    },
    [hasMore, step],
  );

  useEffect(() => () => observer.current?.disconnect(), []);

  return { visible: hasMore ? items.slice(0, limit) : items, hasMore, sentinelRef };
}
