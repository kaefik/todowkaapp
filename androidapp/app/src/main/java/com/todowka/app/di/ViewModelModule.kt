package com.todowka.app.di

import com.todowka.app.ui.screens.auth.LoginViewModel
import com.todowka.app.ui.screens.auth.RegisterViewModel
import com.todowka.app.ui.screens.calendar.CalendarViewModel
import com.todowka.app.ui.screens.calendar.EventsViewModel
import com.todowka.app.ui.screens.notifications.NotificationsViewModel
import com.todowka.app.ui.screens.onboarding.OnboardingViewModel
import com.todowka.app.ui.screens.profile.ProfileViewModel
import com.todowka.app.ui.screens.review.ReviewViewModel
import com.todowka.app.ui.screens.settings.SettingsViewModel
import com.todowka.app.ui.screens.tasks.ActiveViewModel
import com.todowka.app.ui.screens.tasks.CompletedViewModel
import com.todowka.app.ui.screens.tasks.InboxViewModel
import com.todowka.app.ui.screens.tasks.NextActionsViewModel
import com.todowka.app.ui.screens.tasks.SomedayViewModel
import com.todowka.app.ui.screens.tasks.TodayViewModel
import com.todowka.app.ui.screens.tasks.TomorrowViewModel
import com.todowka.app.ui.screens.tasks.TrashViewModel
import com.todowka.app.ui.screens.tasks.TasksViewModel
import com.todowka.app.ui.screens.tasks.WaitingForViewModel
import com.todowka.app.ui.screens.areas.AreasViewModel
import com.todowka.app.ui.screens.areas.AreaDetailViewModel
import com.todowka.app.ui.screens.contexts.ContextsViewModel
import com.todowka.app.ui.screens.tags.TagsViewModel
import com.todowka.app.ui.screens.projects.ProjectsViewModel
import com.todowka.app.ui.screens.projects.ProjectDetailViewModel
import org.koin.core.module.dsl.viewModelOf
import org.koin.dsl.module

val viewModelModule = module {
    viewModelOf(::LoginViewModel)
    viewModelOf(::RegisterViewModel)
    viewModelOf(::TasksViewModel)
    viewModelOf(::InboxViewModel)
    viewModelOf(::ActiveViewModel)
    viewModelOf(::TodayViewModel)
    viewModelOf(::TomorrowViewModel)
    viewModelOf(::NextActionsViewModel)
    viewModelOf(::WaitingForViewModel)
    viewModelOf(::SomedayViewModel)
    viewModelOf(::CompletedViewModel)
    viewModelOf(::TrashViewModel)
    viewModelOf(::ProjectsViewModel)
    viewModelOf(::ProjectDetailViewModel)
    viewModelOf(::AreasViewModel)
    viewModelOf(::AreaDetailViewModel)
    viewModelOf(::ContextsViewModel)
    viewModelOf(::TagsViewModel)
    viewModelOf(::CalendarViewModel)
    viewModelOf(::EventsViewModel)
    viewModelOf(::NotificationsViewModel)
    viewModelOf(::ProfileViewModel)
    viewModelOf(::SettingsViewModel)
    viewModelOf(::ReviewViewModel)
    viewModelOf(::OnboardingViewModel)
}
