import { createSlice } from '@reduxjs/toolkit'

const themeSlice = createSlice({
    name: 'theme',
    initialState: { dark: false },
    reducers: {
        setTheme: (state, action) => {
            const { darkness } = action.payload
            state.dark = darkness
        },
        
    }
})

export const { setTheme} = themeSlice.actions

export default themeSlice.reducer

export const selectCurrentTheme = (state) => state.theme.dark