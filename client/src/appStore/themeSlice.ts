import { createSlice } from "@reduxjs/toolkit";

// Başlangıç teması: index.html'deki küçük script `<html>`'e `dark` sınıfını
// zaten ekledi (kayıtlı tercih ya da sistem teması); state'i oradan okuyoruz.
const initialDark =
  typeof document !== "undefined" &&
  document.documentElement.classList.contains("dark");

const themeSlice = createSlice({
  name: "theme",
  initialState: { dark: initialDark },
  reducers: {
    setTheme: (state, action: { payload: { darkness: boolean } }) => {
      // DOM'a uygulama ve kaydetme root'taki `ThemeSync` efektinde.
      state.dark = action.payload.darkness;
    },
  },
});

export const { setTheme } = themeSlice.actions;

export default themeSlice.reducer;

export const selectCurrentTheme = (state: { theme: { dark: boolean } }) =>
  state.theme.dark;
