import { createSlice } from '@reduxjs/toolkit'

const pageSlice = createSlice({
    name: 'pages',
    initialState: { page: 1 },
    reducers: {
        setPage: (state, action) => {
            const { sayfa } = action.payload
            state.page = sayfa
        },
    }
})

export const { setPage} = pageSlice.actions

export default pageSlice.reducer

export const selectCurrentPage = (state) => state.pages.page