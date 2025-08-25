-- nfc_hospital_db_admin_logs.txt
DROP TABLE IF EXISTS `admin_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_logs` (
  `log_id` bigint NOT NULL AUTO_INCREMENT,
  `action` varchar(10) NOT NULL,
  `target_table` varchar(100) NOT NULL,
  `target_id` varchar(100) NOT NULL,
  `timestamp` datetime(6) NOT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`log_id`),
  KEY `admin_logs_user_id_916751_idx` (`user_id`,`timestamp`),
  KEY `admin_logs_action_cc36f2_idx` (`action`,`timestamp`),
  KEY `admin_logs_target__315337_idx` (`target_table`,`target_id`),
  KEY `admin_logs_timesta_952aa9_idx` (`timestamp`),
  CONSTRAINT `admin_logs_user_id_7cc6dd52_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
)

-- nfc_hospital_db_appointment_histories.txt
CREATE TABLE `appointment_histories` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `action` varchar(20) NOT NULL,
  `note` longtext,
  `created_at` datetime(6) NOT NULL,
  `appointment_id` varchar(50) NOT NULL,
  `created_by_id` char(32) DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  KEY `appointment_appoint_08501f_idx` (`appointment_id`,`created_at`),
  KEY `appointment_action_7efe73_idx` (`action`),
  KEY `appointment_histories_created_by_id_74318ed3_fk_users_user_id` (`created_by_id`),
  CONSTRAINT `appointment_historie_appointment_id_55ea2fdd_fk_appointme` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`appointment_id`),
  CONSTRAINT `appointment_histories_created_by_id_74318ed3_fk_users_user_id` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
)

-- nfc_hospital_db_appointments.txt
CREATE TABLE `appointments` (
  `appointment_id` varchar(50) NOT NULL,
  `status` varchar(10) NOT NULL,
  `arrival_confirmed` tinyint(1) NOT NULL,
  `scheduled_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `exam_id` varchar(50) NOT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`appointment_id`),
  KEY `appointment_user_id_ed0db4_idx` (`user_id`,`scheduled_at`),
  KEY `appointment_exam_id_8a2787_idx` (`exam_id`,`scheduled_at`),
  KEY `appointment_status_e303fa_idx` (`status`,`scheduled_at`),
  KEY `appointment_schedul_2da7be_idx` (`scheduled_at`),
  CONSTRAINT `appointments_exam_id_b6e069e8_fk_exams_exam_id` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`exam_id`),
  CONSTRAINT `appointments_user_id_052f0814_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
)

-- nfc_hospital_db_auth_device_tokens.txt
CREATE TABLE `auth_device_tokens` (
  `device_id` char(32) NOT NULL,
  `token` varchar(255) NOT NULL,
  `device_uuid` varchar(255) NOT NULL,
  `device_type` varchar(10) NOT NULL,
  `device_name` varchar(100) DEFAULT NULL,
  `device_model` varchar(100) DEFAULT NULL,
  `user_agent` longtext,
  `app_version` varchar(20) DEFAULT NULL,
  `fcm_token` longtext,
  `is_active` tinyint(1) NOT NULL,
  `is_trusted` tinyint(1) NOT NULL,
  `last_ip_address` char(39) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `last_login_at` datetime(6) NOT NULL,
  `expires_at` datetime(6) DEFAULT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`device_id`),
  UNIQUE KEY `token` (`token`),
  UNIQUE KEY `device_uuid` (`device_uuid`),
  KEY `auth_device_user_id_ea16f5_idx` (`user_id`,`is_active`),
  KEY `auth_device_token_755da8_idx` (`token`),
  KEY `auth_device_device__efe499_idx` (`device_uuid`),
  KEY `auth_device_user_id_6f08da_idx` (`user_id`,`device_type`,`is_active`),
  CONSTRAINT `auth_device_tokens_user_id_090c3099_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
)

-- nfc_hospital_db_auth_group.txt
CREATE TABLE `auth_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
)

-- nfc_hospital_db_auth_group_permissions.txt
CREATE TABLE `auth_group_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`)
)

-- nfc_hospital_db_auth_login_attempts.txt
CREATE TABLE `auth_login_attempts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `phone_last4` varchar(4) DEFAULT NULL,
  `birth_date` varchar(6) DEFAULT NULL,
  `login_type` varchar(10) NOT NULL,
  `status` varchar(10) NOT NULL,
  `device_uuid` varchar(255) DEFAULT NULL,
  `user_agent` longtext,
  `ip_address` char(39) NOT NULL,
  `failure_reason` varchar(100) DEFAULT NULL,
  `attempted_at` datetime(6) NOT NULL,
  `user_id` char(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `auth_login__ip_addr_0fb781_idx` (`ip_address`,`attempted_at`),
  KEY `auth_login__phone_l_ae1e87_idx` (`phone_last4`,`attempted_at`),
  KEY `auth_login__device__25056d_idx` (`device_uuid`,`status`),
  KEY `auth_login_attempts_user_id_e6e72f0f_fk_users_user_id` (`user_id`),
  CONSTRAINT `auth_login_attempts_user_id_e6e72f0f_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
)

-- nfc_hospital_db_auth_permission.txt
CREATE TABLE `auth_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `content_type_id` int NOT NULL,
  `codename` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
)

-- nfc_hospital_db_django_admin_log.txt
CREATE TABLE `django_admin_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint unsigned NOT NULL,
  `change_message` longtext NOT NULL,
  `content_type_id` int DEFAULT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_users_user_id` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `django_admin_log_chk_1` CHECK ((`action_flag` >= 0))
)

-- nfc_hospital_db_django_content_type.txt
CREATE TABLE `django_content_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
)

-- nfc_hospital_db_django_migrations.txt
CREATE TABLE `django_migrations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
)

-- nfc_hospital_db_django_session.txt
CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
)

-- nfc_hospital_db_emr_sync_status.txt
CREATE TABLE `emr_sync_status` (
  `sync_id` varchar(36) NOT NULL,
  `patient_emr_id` varchar(100) NOT NULL,
  `last_sync_time` datetime(6) NOT NULL,
  `sync_success` tinyint(1) NOT NULL,
  `error_message` longtext,
  `retry_count` int NOT NULL,
  `emr_raw_status` varchar(50) DEFAULT NULL,
  `emr_department` varchar(50) DEFAULT NULL,
  `emr_appointment_date` date DEFAULT NULL,
  `emr_appointment_time` time(6) DEFAULT NULL,
  `emr_doctor_id` varchar(50) DEFAULT NULL,
  `emr_room_number` varchar(20) DEFAULT NULL,
  `mapped_state` varchar(20) DEFAULT NULL,
  `mapping_rules_version` varchar(10) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `user_id` char(32) DEFAULT NULL,
  PRIMARY KEY (`sync_id`),
  KEY `emr_sync_status_user_id_02901d83_fk_users_user_id` (`user_id`),
  KEY `emr_sync_st_patient_660dd7_idx` (`patient_emr_id`),
  KEY `emr_sync_st_last_sy_c8ef0b_idx` (`last_sync_time`),
  KEY `emr_sync_st_mapped__c614b8_idx` (`mapped_state`),
  CONSTRAINT `emr_sync_status_user_id_02901d83_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
)

-- nfc_hospital_db_exam_preparations.txt
CREATE TABLE `exam_preparations` (
  `prep_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `description` longtext NOT NULL,
  `is_required` tinyint(1) NOT NULL,
  `exam_id` varchar(50) NOT NULL,
  `icon` varchar(200) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  PRIMARY KEY (`prep_id`),
  KEY `exam_prepar_exam_id_17dab8_idx` (`exam_id`,`is_required`),
  KEY `exam_prepar_exam_id_473f95_idx` (`exam_id`,`type`),
  CONSTRAINT `exam_preparations_exam_id_d47befcb_fk_exams_exam_id` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`exam_id`)
)

-- nfc_hospital_db_exam_post_care_instructions.txt
CREATE TABLE `exam_post_care_instructions` (
  `instruction_id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` longtext NOT NULL,
  `priority` varchar(10) NOT NULL,
  `duration_hours` int DEFAULT NULL,
  `icon` varchar(200) DEFAULT NULL,
  `is_critical` tinyint(1) NOT NULL,
  `exam_id` varchar(50) NOT NULL,
  PRIMARY KEY (`instruction_id`),
  KEY `exam_post_care_exam_id_priority_idx` (`exam_id`,`priority`),
  KEY `exam_post_care_exam_id_type_idx` (`exam_id`,`type`),
  KEY `exam_post_care_is_critical_idx` (`is_critical`),
  CONSTRAINT `exam_post_care_instructions_exam_id_fk_exams_exam_id` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`exam_id`)
)

-- nfc_hospital_db_exams.txt
CREATE TABLE `exams` (
  `exam_id` varchar(50) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` longtext NOT NULL,
  `department` varchar(100) NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL,
  `building` varchar(100) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `floor` varchar(50) DEFAULT NULL,
  `room` varchar(100) DEFAULT NULL,
  `average_duration` int NOT NULL,
  `buffer_time` int NOT NULL,
  `x_coord` double NOT NULL,
  `y_coord` double NOT NULL,
  PRIMARY KEY (`exam_id`),
  KEY `exams_departm_022a01_idx` (`department`),
  KEY `exams_is_acti_5cee66_idx` (`is_active`),
  KEY `exams_buildin_9b27e8_idx` (`building`,`floor`,`room`),
  KEY `exams_categor_f7eb60_idx` (`category`)
)

-- nfc_hospital_db_feedbacks.txt
CREATE TABLE `feedbacks` (
  `feedback_id` char(32) NOT NULL,
  `category` varchar(20) NOT NULL,
  `rating` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` longtext NOT NULL,
  `status` varchar(20) NOT NULL,
  `response` longtext,
  `responded_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `assigned_to_user_id` char(32) DEFAULT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`feedback_id`),
  KEY `feedbacks_user_id_c7b83f_idx` (`user_id`,`created_at`),
  KEY `feedbacks_categor_862552_idx` (`category`,`status`),
  KEY `feedbacks_status_e7bc93_idx` (`status`,`created_at`),
  KEY `feedbacks_assigne_f7acd7_idx` (`assigned_to_user_id`,`status`),
  CONSTRAINT `feedbacks_assigned_to_user_id_6bb7cbdf_fk_users_user_id` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `feedbacks_user_id_be6417c2_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
)

-- nfc_hospital_db_nfc_tag_exams.txt
CREATE TABLE `nfc_tag_exams` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `exam_name` varchar(100) NOT NULL,
  `exam_room` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `exam_id` varchar(50) DEFAULT NULL,
  `tag_id` char(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nfc_tag_exams_tag_id_exam_id_22cc91d3_uniq` (`tag_id`,`exam_id`),
  KEY `nfc_tag_exa_exam_id_60f10a_idx` (`exam_id`),
  KEY `nfc_tag_exa_is_acti_5d8225_idx` (`is_active`),
  CONSTRAINT `nfc_tag_exams_exam_id_4ec42a3e_fk_exams_exam_id` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`exam_id`),
  CONSTRAINT `nfc_tag_exams_tag_id_2f1da37f_fk_nfc_tags_tag_id` FOREIGN KEY (`tag_id`) REFERENCES `nfc_tags` (`tag_id`)
)

-- nfc_hospital_db_nfc_tags.txt
CREATE TABLE `nfc_tags` (
  `tag_id` char(32) NOT NULL,
  `tag_uid` varchar(255) NOT NULL,
  `code` varchar(100) NOT NULL,
  `building` varchar(100) NOT NULL,
  `floor` int NOT NULL,
  `room` varchar(100) NOT NULL,
  `description` longtext NOT NULL,
  `x_coord` double NOT NULL,
  `y_coord` double NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `last_scanned_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`tag_id`),
  UNIQUE KEY `tag_uid` (`tag_uid`),
  UNIQUE KEY `code` (`code`),
  KEY `nfc_tags_tag_uid_9adf71_idx` (`tag_uid`),
  KEY `nfc_tags_code_017718_idx` (`code`),
  KEY `nfc_tags_buildin_b0674f_idx` (`building`,`floor`),
  KEY `nfc_tags_is_acti_fa2d8a_idx` (`is_active`)
)

-- nfc_hospital_db_notification_settings.txt
CREATE TABLE `notification_settings` (
  `user_id` char(32) NOT NULL,
  `queue_update` tinyint(1) NOT NULL,
  `patient_call` tinyint(1) NOT NULL,
  `exam_ready` tinyint(1) NOT NULL,
  `exam_complete` tinyint(1) NOT NULL,
  `appointment_reminder` tinyint(1) NOT NULL,
  `system` tinyint(1) NOT NULL,
  `emergency` tinyint(1) NOT NULL,
  `do_not_disturb_enabled` tinyint(1) NOT NULL,
  `do_not_disturb_start` time(6) DEFAULT NULL,
  `do_not_disturb_end` time(6) DEFAULT NULL,
  `notification_sound` varchar(20) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `notification_settings_user_id_ce43fde1_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
)

-- nfc_hospital_db_notifications.txt
CREATE TABLE `notifications` (
  `notification_id` char(32) NOT NULL,
  `type` varchar(30) NOT NULL,
  `title` varchar(100) NOT NULL,
  `message` longtext NOT NULL,
  `data` json NOT NULL,
  `status` varchar(10) NOT NULL,
  `fcm_response` json DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `sent_at` datetime(6) DEFAULT NULL,
  `read_at` datetime(6) DEFAULT NULL,
  `device_token_id` char(32) DEFAULT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`notification_id`),
  KEY `notifications_device_token_id_2ce41bda_fk_auth_devi` (`device_token_id`),
  KEY `notificatio_user_id_8ab96f_idx` (`user_id`,`status`),
  KEY `notificatio_type_cb6908_idx` (`type`,`created_at`),
  KEY `notificatio_status_dee16f_idx` (`status`,`created_at`),
  CONSTRAINT `notifications_device_token_id_2ce41bda_fk_auth_devi` FOREIGN KEY (`device_token_id`) REFERENCES `auth_device_tokens` (`device_id`),
  CONSTRAINT `notifications_user_id_468e288d_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
)

-- nfc_hospital_db_patient_states.txt
CREATE TABLE `patient_states` (
  `state_id` varchar(36) NOT NULL,
  `current_state` varchar(20) NOT NULL,
  `current_location` varchar(36) DEFAULT NULL,
  `current_exam` varchar(50) DEFAULT NULL,
  `emr_patient_id` varchar(100) DEFAULT NULL,
  `emr_raw_status` varchar(50) DEFAULT NULL,
  `emr_department` varchar(50) DEFAULT NULL,
  `emr_appointment_time` datetime(6) DEFAULT NULL,
  `emr_latest_update` datetime(6) DEFAULT NULL,
  `is_logged_in` tinyint(1) NOT NULL,
  `login_method` varchar(20) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`state_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `patient_sta_current_a968e4_idx` (`current_state`),
  KEY `patient_sta_emr_pat_9b31c8_idx` (`emr_patient_id`),
  KEY `patient_sta_emr_app_c28ecb_idx` (`emr_appointment_time`),
  CONSTRAINT `patient_states_user_id_792f249a_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
)

-- nfc_hospital_db_queue_status_logs.txt
CREATE TABLE `queue_status_logs` (
  `log_id` char(32) NOT NULL,
  `previous_state` varchar(20) DEFAULT NULL,
  `new_state` varchar(20) NOT NULL,
  `previous_number` int DEFAULT NULL,
  `new_number` int DEFAULT NULL,
  `reason` varchar(200) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `changed_by_id` char(32) DEFAULT NULL,
  `queue_id` char(32) NOT NULL,
  `estimated_wait_time_at_time` int DEFAULT NULL,
  `location` varchar(36) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `queue_position_at_time` int DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `queue_statu_queue_i_1a0e94_idx` (`queue_id`,`created_at`),
  KEY `queue_statu_new_sta_f4bd56_idx` (`new_state`),
  KEY `queue_status_logs_changed_by_id_14798e4d_fk_users_user_id` (`changed_by_id`),
  KEY `queue_statu_locatio_4ff469_idx` (`location`),
  CONSTRAINT `queue_status_logs_changed_by_id_14798e4d_fk_users_user_id` FOREIGN KEY (`changed_by_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `queue_status_logs_queue_id_682336a8_fk_queues_queue_id` FOREIGN KEY (`queue_id`) REFERENCES `queues` (`queue_id`)
)

-- nfc_hospital_db_queues.txt
CREATE TABLE `queues` (
  `queue_id` char(32) NOT NULL,
  `state` varchar(20) NOT NULL,
  `queue_number` int NOT NULL,
  `estimated_wait_time` int NOT NULL,
  `priority` varchar(10) NOT NULL,
  `called_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `appointment_id` varchar(50) NOT NULL,
  `exam_id` varchar(50) NOT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`queue_id`),
  KEY `queues_exam_id_eb605e_idx` (`exam_id`,`state`),
  KEY `queues_user_id_ccbcdb_idx` (`user_id`),
  KEY `queues_state_288652_idx` (`state`,`queue_number`),
  KEY `queues_created_3277e5_idx` (`created_at`),
  KEY `queues_priorit_75cf5b_idx` (`priority`,`state`),
  KEY `queues_appointment_id_230d4c72_fk_appointments_appointment_id` (`appointment_id`),
  CONSTRAINT `queues_appointment_id_230d4c72_fk_appointments_appointment_id` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`appointment_id`),
  CONSTRAINT `queues_exam_id_22792f2b_fk_exams_exam_id` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`exam_id`),
  CONSTRAINT `queues_user_id_703c55a5_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
)

-- nfc_hospital_db_state_transitions.txt
CREATE TABLE `state_transitions` (
  `transition_id` varchar(36) NOT NULL,
  `from_state` varchar(20) DEFAULT NULL,
  `to_state` varchar(20) NOT NULL,
  `trigger_type` varchar(20) NOT NULL,
  `trigger_source` varchar(100) DEFAULT NULL,
  `location_at_transition` varchar(36) DEFAULT NULL,
  `exam_id` varchar(50) DEFAULT NULL,
  `emr_reference` varchar(100) DEFAULT NULL,
  `emr_status_before` varchar(50) DEFAULT NULL,
  `emr_status_after` varchar(50) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`transition_id`),
  KEY `state_trans_user_id_835b0b_idx` (`user_id`,`created_at`),
  KEY `state_trans_trigger_fd1f45_idx` (`trigger_type`,`created_at`),
  KEY `state_trans_from_st_00880a_idx` (`from_state`,`to_state`),
  CONSTRAINT `state_transitions_user_id_bbb1bfef_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
)

-- nfc_hospital_db_tag_logs.txt
CREATE TABLE `tag_logs` (
  `log_id` bigint NOT NULL AUTO_INCREMENT,
  `action_type` varchar(10) NOT NULL,
  `timestamp` datetime(6) NOT NULL,
  `tag_id` char(32) NOT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`log_id`),
  KEY `tag_logs_user_id_cf33d7_idx` (`user_id`,`timestamp`),
  KEY `tag_logs_tag_id_48e147_idx` (`tag_id`,`timestamp`),
  KEY `tag_logs_action__104e61_idx` (`action_type`),
  KEY `tag_logs_timesta_efc753_idx` (`timestamp`),
  CONSTRAINT `tag_logs_tag_id_a1b736b8_fk_nfc_tags_tag_id` FOREIGN KEY (`tag_id`) REFERENCES `nfc_tags` (`tag_id`),
  CONSTRAINT `tag_logs_user_id_3457a980_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
)

-- nfc_hospital_db_facility_routes.txt
CREATE TABLE `facility_routes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `facility_name` varchar(100) NOT NULL,
  `nodes` json NOT NULL,
  `edges` json NOT NULL,
  `map_id` varchar(50) NOT NULL,
  `svg_element_id` varchar(100) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `facility_name` (`facility_name`),
  KEY `facility_routes_facility_name_idx` (`facility_name`),
  KEY `facility_routes_map_id_idx` (`map_id`),
  KEY `facility_routes_facility_name_map_id_idx` (`facility_name`,`map_id`)
)

-- nfc_hospital_db_users.txt
CREATE TABLE `users` (
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint NOT NULL DEFAULT '0',
  `user_id` char(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `birth_date` date NOT NULL,
  `patient_id` varchar(20) DEFAULT NULL,
  `emergency_contact` varchar(20) DEFAULT NULL,
  `allergies` json NOT NULL,
  `last_login_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `is_staff` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `users_email_4b85f2_idx` (`email`),
  KEY `users_role_a8f2ba_idx` (`role`,`is_active`),
  KEY `users_phone_n_a3b1c5_idx` (`phone_number`),
  KEY `users_patient_96e1c9_idx` (`patient_id`)
)

-- nfc_hospital_db_users_groups.txt
CREATE TABLE `users_groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` char(32) NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_groups_user_id_group_id_fc7788e8_uniq` (`user_id`,`group_id`),
  KEY `users_groups_group_id_2f3517aa_fk_auth_group_id` (`group_id`),
  CONSTRAINT `users_groups_group_id_2f3517aa_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
)

-- nfc_hospital_db_users_user_permissions.txt
CREATE TABLE `users_user_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` char(32) NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_user_permissions_user_id_permission_id_3b86cbdf_uniq` (`user_id`,`permission_id`),
  KEY `users_user_permissio_permission_id_6d08dcd2_fk_auth_perm` (`permission_id`),
  CONSTRAINT `users_user_permissio_permission_id_6d08dcd2_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`)
)

