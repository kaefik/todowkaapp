package com.todowka.app.di

import com.todowka.app.util.NetworkMonitor
import org.koin.dsl.module

val appModule = module {
    single { NetworkMonitor(get()) }
}
