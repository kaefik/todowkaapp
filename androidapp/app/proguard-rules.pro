-keepattributes *Annotation*, Signature, Exceptions
-keep class kotlinx.serialization.Serializable {
    *;
}
-keepclassmembers class kotlinx.serialization.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.todowka.app.**$$serializer { *; }
-keepclassmembers class com.todowka.app.** {
    *** Companion;
}
-keepclasseswithmembers class com.todowka.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-dontwarn kotlinx.serialization.**
