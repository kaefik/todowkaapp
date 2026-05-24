package com.todowka.app.data.remote.api

import com.todowka.app.data.remote.dto.request.CalendarEventCreateRequest
import com.todowka.app.data.remote.dto.request.CalendarEventUpdateRequest
import com.todowka.app.data.remote.dto.response.CalendarEventListResponse
import com.todowka.app.data.remote.dto.response.CalendarEventResponse
import com.todowka.app.data.remote.dto.response.CalendarEventSelectItem
import com.todowka.app.data.remote.dto.response.EventRecurrenceListResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface CalendarEventsApi {

    @GET("api/calendar-events")
    suspend fun getEvents(
        @Query("start_date") startDate: String? = null,
        @Query("end_date") endDate: String? = null,
        @Query("updated_since") updatedSince: String? = null,
        @Query("limit") limit: Int = 100,
        @Query("offset") offset: Int = 0
    ): Response<CalendarEventListResponse>

    @GET("api/calendar-events/for-select")
    suspend fun getEventsForSelect(): Response<List<CalendarEventSelectItem>>

    @POST("api/calendar-events")
    suspend fun createEvent(@Body request: CalendarEventCreateRequest): Response<CalendarEventResponse>

    @GET("api/calendar-events/{id}")
    suspend fun getEvent(@Path("id") eventId: String): Response<CalendarEventResponse>

    @PUT("api/calendar-events/{id}")
    suspend fun updateEvent(
        @Path("id") eventId: String,
        @Body request: CalendarEventUpdateRequest
    ): Response<CalendarEventResponse>

    @DELETE("api/calendar-events/{id}")
    suspend fun deleteEvent(@Path("id") eventId: String): Response<Unit>

    @GET("api/calendar-events/{id}/recurrences")
    suspend fun getEventRecurrences(
        @Path("id") eventId: String,
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0
    ): Response<EventRecurrenceListResponse>

    @POST("api/calendar-events/{id}/stop-recurrence")
    suspend fun stopEventRecurrence(@Path("id") eventId: String): Response<CalendarEventResponse>
}
