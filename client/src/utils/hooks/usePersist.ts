import { useState, useEffect } from "react";

const usePersist = () => {
  const [persist, setPersist] = useState(() => {
    const saved = localStorage.getItem("persist");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("persist", JSON.stringify(persist));
  }, [persist]);

  return [persist, setPersist];
};
export default usePersist;
