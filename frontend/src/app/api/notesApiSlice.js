import {
    createSelector,
    createEntityAdapter
} from "@reduxjs/toolkit";
import { apiSlice } from "./apiSlice"

const notesAdapter = createEntityAdapter({
    sortComparer: (a, b) => (a.girisTarihi > b.girisTarihi ? -1 :  1 )
})

const raporAdapter = createEntityAdapter({
    /* selectId: (data) => data.notes, */
    sortComparer: (a, b) => (a.cikisTarihi > b.cikisTarihi ? -1 : 1 )
})

const initialState = notesAdapter.getInitialState()
const initialStateR = raporAdapter.getInitialState()

export const notesApiSlice = apiSlice.injectEndpoints({
    endpoints: builder => ({
        getNotes: builder.query({
            query: () => ({
                url: '/notes',
                validateStatus: (response, result) => {
                    return response.status === 200 && !result.isError
                },
            }),
            transformResponse: responseData => {
                const loadedNotes = responseData.map(note => {
                    note.id = note._id
                    return note
                });
                return notesAdapter.setAll(initialState, loadedNotes)
            },
            
            providesTags: (result, error, arg) => {
                if (result?.ids) {
                    return [
                        { type: 'Note', id: 'LIST' },
                        ...result.ids.map(id => ({ type: 'Note', id }))
                    ]
                } else return [{ type: 'Note', id: 'LIST' }]
            }
        }),
        
        getRapor: builder.query({
            query: (page) => ({
                url: `/rapor?page=${page}`,
                validateStatus: (response, result) => {
                    return response.status === 200 && !result.isError
                },
            }),
            transformResponse: responseData => {
                const loadedRapor = responseData.notes.map(note => {
                    note.id = note._id
                    return note
                })

                const {pagination} = responseData
            
                const notes = raporAdapter.setAll(initialStateR, loadedRapor)
                return {notes, pagination}
            },
            
            providesTags: (result, error, arg) => {
                if (result?.ids) {
                    return [
                        { type: 'Note', id: 'LIST' },
                        ...result.ids.map(id => ({ type: 'Note', id }))
                    ]
                } else return [{ type: 'Note', id: 'LIST' }]
            },

            
        }),
        addNewNote: builder.mutation({
            query: initialNote => ({
                url: '/notes',
                method: 'POST',
                body: {
                    ...initialNote,
                }
            }),
            invalidatesTags: [
                { type: 'Note', id: "LIST" }
            ]
        }),
        updateNote: builder.mutation({
            query: initialNote => ({
                url: '/notes',
                method: 'PATCH',
                body: {
                    ...initialNote,
                }
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Note', id: "LIST" },
                { type: 'Note', id: arg.id }
            ]
        }),
        updateRapor: builder.mutation({
            query: initialNote => ({
                url: '/rapor',
                method: 'PATCH',
                body: {
                    ...initialNote,
                }
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Note', id: "LIST" },
                { type: 'Note', id: arg.id }
            ]
        }),
        
        cikis: builder.mutation({
            query: initialNote => ({
                url: '/cikis',
                method: 'PATCH',
                body: {
                    ...initialNote,
                }
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Note', id: "LIST" },
                { type: 'Note', id: arg.id }
            ]
        }),
        gumrukBilgi: builder.mutation({
            query: initialNote => ({
                url: '/gumruk',
                method: 'PATCH',
                body: {
                    ...initialNote,
                }
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Note', id: arg.id }
            ]
        }),
        
        deleteNote: builder.mutation({
            query: ({ id }) => ({
                url: `/notes`,
                method: 'DELETE',
                body: { id }
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Note', id: "LIST" },
                { type: 'Note', id: arg.id }
            ]
        }),
    }),
})

export const {
    useGetNotesQuery,
    useGetRaporQuery,
    useAddNewNoteMutation,
    useUpdateNoteMutation,
    useUpdateRaporMutation,
    useCikisMutation,
    useGumrukBilgiMutation,
    useDeleteNoteMutation,
    useGetNoteQuery,
} = notesApiSlice

// returns the query result object
export const selectNotesResult = notesApiSlice.endpoints.getNotes.select()

// creates memoized selector
const selectNotesData = createSelector(
    selectNotesResult,
    notesResult => notesResult.data // normalized state object with ids & entities
)

//getSelectors creates these selectors and we rename them with aliases using destructuring
export const {
    selectAll: selectAllNotes,
    selectById: selectNoteById,
    selectIds: selectNoteIds
    // Pass in a selector that returns the notes slice of state
} = notesAdapter.getSelectors(state => selectNotesData(state) ?? initialState)