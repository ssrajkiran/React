-- phpMyAdmin SQL Dump
-- version 5.2.1deb1+jammy2
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Aug 24, 2026 at 03:33 PM
-- Server version: 8.0.46-0ubuntu0.22.04.3
-- PHP Version: 8.1.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `leave_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `ai_reports`
--

CREATE TABLE `ai_reports` (
  `id` int UNSIGNED NOT NULL,
  `report_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `content` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `generated_by` int UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ai_reports`
--

INSERT INTO `ai_reports` (`id`, `report_name`, `content`, `generated_by`, `created_at`) VALUES
(25, 'Report From: 12-05-2026 To: 13-05-2026', '{\n  \"tableData\": [\n    {\n      \"employee\": \"RAJKIRAN S S\",\n      \"project\": \"AUDIT\",\n      \"task\": \"Document Edit in the Document Repository. And also Permission to that.\",\n      \"status\": \"Completed\",\n      \"hours\": 5,\n      \"date\": \"2026-05-12T18:30:00.000Z\"\n    },\n    {\n      \"employee\": \"RAJKIRAN S S\",\n      \"project\": \"Vipra\",\n      \"task\": \"Timesheet Month for the Users Who didnt have Email ID in the Portal. i.e Bulk Upload of timesheet with customised PL,P,OT etc\",\n      \"status\": \"Completed\",\n      \"hours\": 3,\n      \"date\": \"2026-05-12T18:30:00.000Z\"\n    },\n    {\n      \"employee\": \"RAJKIRAN S S\",\n      \"project\": \"AUDIT\",\n      \"task\": \"Document Edit in the Document Repository. And also Permission to that.\",\n      \"status\": \"Completed\",\n      \"hours\": 4,\n      \"date\": \"2026-05-11T18:30:00.000Z\"\n    },\n    {\n      \"employee\": \"RAJKIRAN S S\",\n      \"project\": \"Vipra\",\n      \"task\": \"Timesheet Month for the Users Who didnt have Email ID in the Portal. i.e Bulk Upload of timesheet with customised PL,P,OT etc\",\n      \"status\": \"Completed\",\n      \"hours\": 4,\n      \"date\": \"2026-05-11T18:30:00.000Z\"\n    }\n  ],\n  \"employeeHours\": {\n    \"RAJKIRAN S S\": 16\n  },\n  \"projectHours\": {\n    \"AUDIT\": 9,\n    \"Vipra\": 7\n  },\n  \"projectTaskCounts\": {\n    \"AUDIT\": {\n      \"total\": 2,\n      \"pending\": 0,\n      \"completed\": 2\n    },\n    \"Vipra\": {\n      \"total\": 2,\n      \"pending\": 0,\n      \"completed\": 2\n    }\n  }\n}', 26, '2026-05-13 17:53:43'),
(26, 'Report From: 01-08-2026 To: 06-08-2026', '{\n  \"tableData\": [\n    {\n      \"employee\": \"RAJKIRAN S S\",\n      \"project\": \"HRMS\",\n      \"task\": \"Discussion on the Setup Module and the assign Rights.\",\n      \"status\": \"Completed\",\n      \"hours\": 3,\n      \"date\": \"2026-08-05T18:30:00.000Z\"\n    }\n  ],\n  \"employeeHours\": {\n    \"RAJKIRAN S S\": 3\n  },\n  \"projectHours\": {\n    \"HRMS\": 3\n  },\n  \"projectTaskCounts\": {\n    \"HRMS\": {\n      \"total\": 1,\n      \"pending\": 0,\n      \"completed\": 1\n    }\n  }\n}', 26, '2026-08-06 17:01:20');

-- --------------------------------------------------------

--
-- Table structure for table `holidays`
--

CREATE TABLE `holidays` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `holidays`
--

INSERT INTO `holidays` (`id`, `name`, `date`) VALUES
(2, 'New Year', '2026-02-01'),
(3, 'Pongal', '2026-01-15'),
(4, 'Thiruvlluvar Day', '2026-01-16'),
(5, 'Uzhavar Thirunal', '2026-01-17'),
(6, 'Republic Day', '2026-01-26'),
(7, 'Holi', '2026-03-04'),
(8, 'Ramzan', '2026-03-21'),
(9, 'Tamil New year', '2026-04-14'),
(10, 'May Day', '2026-05-01'),
(11, 'Independence Day', '2026-08-15'),
(12, 'Vinayagar Chaturthi', '2026-09-14'),
(13, 'Gandhi Jayanthi', '2026-10-02'),
(14, 'Ayutha Poojai', '2026-10-19'),
(15, 'Deepavali', '2026-11-08'),
(16, 'Diwali', '2026-11-09'),
(17, 'Christmas', '2026-12-25');

-- --------------------------------------------------------

--
-- Table structure for table `leaves`
--

CREATE TABLE `leaves` (
  `id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `from_date` date DEFAULT NULL,
  `to_date` date DEFAULT NULL,
  `days` decimal(12,2) DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_general_ci,
  `type` enum('leave','compoff','present') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `half_day_type` enum('full','first_half','second_half') COLLATE utf8mb4_general_ci DEFAULT 'full',
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `comp_off_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `leaves`
--

INSERT INTO `leaves` (`id`, `user_id`, `from_date`, `to_date`, `days`, `remarks`, `type`, `half_day_type`, `status`, `created_at`, `comp_off_date`) VALUES
(7, 14, '2026-05-27', '2026-05-28', 2.00, 'personal', 'leave', 'full', 'approved', '2026-05-13 10:17:24', NULL),
(8, 23, '2026-05-16', '2026-05-16', 1.00, 'Personal', 'leave', 'full', 'approved', '2026-05-13 12:07:06', NULL),
(9, 23, '2026-05-25', '2026-05-25', 1.00, 'Personal', 'leave', 'full', 'approved', '2026-05-26 06:15:11', NULL),
(10, 23, '2026-06-06', '2026-06-06', 1.00, 'Personal', 'leave', 'full', 'approved', '2026-06-02 10:58:22', NULL),
(11, 23, '2026-04-27', '2026-04-27', 1.00, 'Personal', 'leave', 'full', 'approved', '2026-06-02 10:58:22', NULL),
(12, 23, '2026-04-06', '2026-04-06', 1.00, 'Personal', 'leave', 'full', 'approved', '2026-06-02 10:58:22', NULL),
(13, 23, '2026-06-25', '2026-06-26', 2.00, 'Personal', 'leave', 'full', 'approved', '2026-06-15 10:58:22', NULL),
(14, 23, '2026-07-18', '2026-07-18', 1.00, 'Personal', 'leave', 'full', 'approved', '2026-07-17 03:44:20', NULL),
(16, 23, '2026-08-03', '2026-08-03', 1.00, 'Personal', 'leave', 'full', 'pending', '2026-08-04 07:07:53', NULL),
(17, 23, '2026-08-21', '2026-08-21', 1.00, 'Personal', 'leave', 'full', 'pending', '2026-08-20 05:58:17', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `permission`
--

CREATE TABLE `permission` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `date` date NOT NULL,
  `hours` int NOT NULL,
  `slot` enum('morning','evening') COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `remarks` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `permission`
--

INSERT INTO `permission` (`id`, `user_id`, `date`, `hours`, `slot`, `status`, `remarks`, `created_at`) VALUES
(4, 23, '2026-05-15', 2, 'evening', 'approved', 'Personal', '2026-05-13 12:07:34'),
(5, 23, '2026-06-02', 2, 'evening', 'approved', 'Personal', '2026-06-02 10:58:13'),
(6, 23, '2026-04-10', 2, 'evening', 'approved', 'Personal', '2026-06-02 10:58:13'),
(7, 23, '2026-07-04', 2, 'evening', 'approved', 'Personal', '2026-07-06 04:14:36');

-- --------------------------------------------------------

--
-- Table structure for table `present_on_holiday`
--

CREATE TABLE `present_on_holiday` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `date` date NOT NULL,
  `holiday_name` varchar(255) DEFAULT NULL,
  `remarks` text,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

CREATE TABLE `projects` (
  `id` int NOT NULL,
  `project_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `projects`
--

INSERT INTO `projects` (`id`, `project_name`, `created_at`, `updated_at`) VALUES
(1, 'VDMS', '2026-02-22 12:40:07', '2026-02-22 12:40:07'),
(2, 'VMCL NEW', '2026-02-22 12:45:58', '2026-02-22 12:45:58'),
(3, 'Test', '2026-03-07 12:45:08', '2026-03-07 12:45:08'),
(4, 'AUDIT', '2026-03-08 03:35:25', '2026-03-08 03:35:25'),
(5, 'Vipra', '2026-03-08 15:53:21', '2026-03-08 15:53:21'),
(6, 'Test', '2026-05-03 15:08:37', '2026-05-03 15:08:37'),
(7, 'HRMS', '2026-05-06 05:09:09', '2026-05-06 05:09:09'),
(8, 'VMCL NEW ', '2026-05-13 11:54:07', '2026-05-13 11:54:07'),
(9, 'Server', '2026-05-13 12:02:26', '2026-05-13 12:02:26'),
(10, 'CRM', '2026-05-13 12:03:19', '2026-05-13 12:03:19');

-- --------------------------------------------------------

--
-- Table structure for table `task`
--

CREATE TABLE `task` (
  `id` int NOT NULL,
  `project_id` int NOT NULL,
  `task` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `assigned_to` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'In Progress',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `task`
--

INSERT INTO `task` (`id`, `project_id`, `task`, `assigned_to`, `status`, `created_at`, `updated_at`, `created_by`) VALUES
(1, 1, 'Assign rights for the Side Menu', '13', 'In Progress', '2026-03-07 06:17:36', '2026-03-08 13:17:51', 4),
(2, 1, 'Lock on timesheet', '13,1', 'Completed', '2026-03-07 06:17:56', '2026-03-08 13:18:44', 4),
(3, 2, 'Check MRS', '1', 'In Progress', '2026-03-07 06:18:14', '2026-03-08 13:18:42', 1),
(5, 1, 'test', '1', 'In Progress', '2026-03-07 12:43:22', '2026-03-08 13:18:46', 4),
(7, 3, 'Test22', '13', 'In Progress', '2026-03-07 12:46:30', '2026-03-07 12:46:30', 4),
(8, 3, 'Test32', '13,1', 'Completed', '2026-03-07 12:46:30', '2026-03-08 13:18:48', 4),
(9, 3, '1', '13', 'Completed', '2026-03-07 13:18:19', '2026-03-08 10:32:45', 4),
(10, 2, 'VMCL New', '13', 'In Progress', '2026-03-08 03:04:27', '2026-03-08 03:04:27', 13),
(11, 4, 'Creating Forms for Audit', '1', 'Completed', '2026-03-08 03:35:25', '2026-05-04 09:37:32', 1),
(12, 4, 'Word file Edit check', '13', 'In Progress', '2026-03-08 03:35:25', '2026-03-08 13:18:28', 1),
(13, 5, 'Add timesheet', '1', 'Completed', '2026-03-08 15:53:21', '2026-03-08 15:53:55', 1),
(14, 4, 'test2314', '1', 'Completed', '2026-04-25 11:40:33', '2026-04-25 12:25:46', 1),
(16, 4, 'test', '15', 'In Progress', '2026-04-30 04:18:14', '2026-04-30 04:18:13', 15),
(17, 4, 'test2', '15', 'In Progress', '2026-04-30 04:18:14', '2026-04-30 04:18:13', 15),
(20, 3, 'Test the project', '1', 'In Progress', '2026-05-02 04:15:56', '2026-05-02 04:15:55', 1),
(21, 2, 'Test', '1,4', 'In Progress', '2026-05-02 09:37:28', '2026-05-02 09:37:28', 4),
(22, 6, 'test', '1', 'In Progress', '2026-05-03 15:08:38', '2026-05-03 15:08:38', 4),
(23, 4, 'test', '15', 'In Progress', '2026-05-05 07:14:12', '2026-05-05 07:14:12', 4),
(24, 7, 'Insurance', '23', 'Completed', '2026-05-06 05:09:10', '2026-05-06 05:15:47', 26),
(26, 5, 'consolidated report changes', '14', 'In Progress', '2026-05-13 10:16:35', '2026-05-13 10:16:34', 14),
(27, 5, 'Added “Follow-up Required” Yes / No option in Visit module.\nFixed Follow-up validation issue:\nIf “Yes” selected → Follow-up entry mandatory.\nIf “No” selected → Visit details save successfully without follow-up entry.\nConsolidated Report Changes:\nFixed Name column alignment.\nFixed Designation column display.\nRemaining month columns changed to horizontal scroll when month count increases.', '14', 'In Progress', '2026-05-13 10:22:07', '2026-05-13 10:22:07', 14),
(28, 4, 'Document Edit in the Document Repository. And also Permission to that.', '23', 'Completed', '2026-05-13 11:50:37', '2026-05-13 11:52:58', 23),
(29, 5, 'Timesheet Month for the Users Who didnt have Email ID in the Portal. i.e Bulk Upload of timesheet with customised PL,P,OT etc', '23', 'Completed', '2026-05-13 11:52:00', '2026-05-13 11:52:55', 23),
(30, 8, 'Meeting ', '23', 'Completed', '2026-05-13 11:54:07', '2026-05-13 12:04:01', 23),
(31, 4, 'Assign Rights on the Document Repository Page and User Page Link.', '23', 'Completed', '2026-05-13 11:55:07', '2026-05-13 12:03:57', 23),
(32, 2, 'MRS & MRS Issue Design & Backend', '23', 'Completed', '2026-05-13 11:55:33', '2026-05-13 12:03:49', 23),
(33, 4, 'Document Link with Division for Document Upload.', '23', 'Completed', '2026-05-13 11:56:15', '2026-05-18 07:09:18', 23),
(34, 1, 'Email Issue on the Mail Server & Assign rights for the Suruthi C.S email for enquiry,Offer and Order', '23', 'Completed', '2026-05-13 11:58:10', '2026-05-13 12:03:42', 23),
(35, 2, 'Account Receivable UI & Backend', '23', 'Completed', '2026-05-13 11:59:15', '2026-05-13 12:03:38', 23),
(36, 5, 'Email User Upload and Timesheet Redesigned as per Sivaraman Sir.', '23', 'Completed', '2026-05-13 12:01:27', '2026-05-13 12:03:33', 23),
(37, 9, 'Server Move & Js Fixed for the HRMS Project.', '23', 'Completed', '2026-05-13 12:02:27', '2026-05-13 12:03:29', 23),
(38, 10, 'For CRM Python Script Resume Parsing and the Permission Given From the Server Side', '23', 'Completed', '2026-05-13 12:03:20', '2026-05-13 12:03:26', 23),
(39, 5, 'For Sivaraman & Gopinath Overall Coordinates has been Updated in the Timesheet Entry as well as Report Page. And also In the Timesheet page it has been added.\n', '23', 'Completed', '2026-05-14 05:04:17', '2026-05-14 11:52:51', 23),
(40, 5, 'Consolidated Reports has been updated like as Direct as well as Indirect Method .\nDirect Method means : Project\nIndirect Method means : OC (Overall Coordination)', '23', 'Completed', '2026-05-14 05:04:17', '2026-05-14 11:52:44', 23),
(41, 5, 'Monthly Report Has been Modified as Per. Employee based as well as below Options.\nIT,P,PL,TT,OT,LT,OC,M,ES,PR,AC\n\n', '23', 'Completed', '2026-05-14 11:52:18', '2026-05-14 11:52:56', 23),
(42, 4, 'Documentation of Whole Project (User Documentation)', '23', 'Completed', '2026-05-15 09:10:48', '2026-05-15 09:11:21', 23),
(43, 10, 'Testing the Lead module. ', '23', 'Completed', '2026-05-18 07:10:28', '2026-05-18 07:11:03', 23),
(44, 10, 'CV download and view move to view page ,Table row redirect to view Page,Table row redirect to view Page, Delete option hide', '23', 'Completed', '2026-05-18 07:10:28', '2026-05-18 07:11:01', 23),
(45, 4, 'Dashboard (Mobile View) & Magazines', '23', 'Completed', '2026-05-21 11:41:56', '2026-05-21 11:42:00', 23),
(46, 10, 'Agreements Upload and Changes on the Create,view and Edit Page', '23', 'Completed', '2026-05-22 03:48:01', '2026-06-04 04:55:29', 23),
(47, 9, 'Discussion & DB Backup Check ', '23', 'Completed', '2026-05-22 03:48:43', '2026-06-04 04:55:26', 23),
(48, 9, 'DB Delete Backup and Set for 7 Days Only. And also File Backup.', '23', 'Completed', '2026-05-22 03:49:23', '2026-06-04 04:55:23', 23),
(49, 7, 'Discussion on the Setup Module and the assign Rights.', '23', 'Completed', '2026-05-22 03:49:49', '2026-06-04 04:55:20', 23),
(50, 5, 'Sivaraman Sir Password check & Report Check Monthly', '1', 'Completed', '2026-05-22 03:51:39', '2026-07-05 02:21:56', 23);

-- --------------------------------------------------------

--
-- Table structure for table `timesheet`
--

CREATE TABLE `timesheet` (
  `id` int NOT NULL,
  `task` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `date` date NOT NULL,
  `man_hrs` int DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `timesheet`
--

INSERT INTO `timesheet` (`id`, `task`, `date`, `man_hrs`, `created_by`, `created_at`, `updated_at`) VALUES
(4, '1', '2026-03-07', 5, 1, '2026-03-07 14:42:24', '2026-03-08 13:19:41'),
(5, '9', '2026-03-07', 2, 1, '2026-03-07 15:06:53', '2026-03-08 13:19:43'),
(6, '8', '2026-03-07', 7, 1, '2026-03-07 15:15:10', '2026-03-08 13:19:45'),
(8, '9', '2026-03-07', 4, 1, '2026-03-07 15:22:49', '2026-03-08 13:19:47'),
(11, '11', '2026-03-08', 4, 1, '2026-03-08 03:36:55', '2026-03-08 13:19:49'),
(12, '12', '2026-03-08', 7, 1, '2026-03-08 03:37:13', '2026-03-08 13:19:52'),
(13, '7', '2026-03-08', 6, 1, '2026-03-08 03:39:40', '2026-03-08 13:19:53'),
(14, '11', '2026-03-08', 7, 1, '2026-03-08 03:39:59', '2026-03-08 13:19:55'),
(15, '13', '2026-03-09', 1, 1, '2026-03-08 15:53:44', '2026-03-08 15:53:44'),
(18, '11', '2026-05-01', 2, 1, '2026-05-01 06:12:40', '2026-05-01 06:12:40'),
(20, '21', '2026-05-02', 3, 4, '2026-05-02 09:52:42', '2026-05-02 09:52:42'),
(21, '21', '2026-05-05', 8, 4, '2026-05-05 07:15:26', '2026-05-05 07:15:26'),
(22, '24', '2026-05-06', 4, 23, '2026-05-06 05:13:38', '2026-05-06 05:13:38'),
(23, '28', '2026-05-13', 5, 23, '2026-05-13 11:50:53', '2026-05-13 11:50:53'),
(24, '29', '2026-05-13', 3, 23, '2026-05-13 11:52:14', '2026-05-13 11:52:14'),
(25, '28', '2026-05-12', 4, 23, '2026-05-13 11:53:12', '2026-05-13 11:53:12'),
(26, '29', '2026-05-12', 4, 23, '2026-05-13 11:53:26', '2026-05-13 11:53:26'),
(27, '30', '2026-05-11', 4, 23, '2026-05-13 11:56:47', '2026-05-13 11:56:47'),
(28, '31', '2026-05-11', 4, 23, '2026-05-13 11:59:49', '2026-05-13 11:59:49'),
(29, '34', '2026-05-07', 1, 23, '2026-05-13 12:00:02', '2026-05-13 12:00:02'),
(30, '35', '2026-05-07', 4, 23, '2026-05-13 12:00:35', '2026-05-13 12:00:35'),
(31, '36', '2026-05-07', 3, 23, '2026-05-13 12:01:37', '2026-05-13 12:01:37'),
(32, '30', '2026-05-08', 3, 23, '2026-05-13 12:04:15', '2026-05-13 12:04:15'),
(33, '37', '2026-05-08', 2, 23, '2026-05-13 12:04:59', '2026-05-13 12:04:59'),
(34, '33', '2026-05-08', 3, 23, '2026-05-13 12:05:15', '2026-05-13 12:05:15'),
(35, '32', '2026-05-09', 2, 23, '2026-05-13 12:05:43', '2026-05-13 12:05:43'),
(36, '37', '2026-05-09', 1, 23, '2026-05-13 12:05:56', '2026-05-13 12:05:56'),
(37, '36', '2026-05-09', 5, 23, '2026-05-13 12:06:19', '2026-05-13 12:06:19'),
(38, '39', '2026-05-14', 1, 23, '2026-05-14 05:04:36', '2026-05-14 05:04:36'),
(39, '29', '2026-05-14', 1, 23, '2026-05-14 05:04:47', '2026-05-14 05:04:47'),
(40, '40', '2026-05-14', 3, 23, '2026-05-14 11:47:50', '2026-05-14 11:47:50'),
(41, '29', '2026-05-14', 3, 23, '2026-05-14 11:52:30', '2026-05-14 11:52:30'),
(42, '42', '2026-05-15', 4, 23, '2026-05-15 09:11:14', '2026-05-15 09:11:14'),
(43, '41', '2026-05-15', 2, 23, '2026-05-15 09:12:07', '2026-05-15 09:12:07'),
(44, '34', '2026-05-15', 2, 23, '2026-05-15 09:12:58', '2026-05-15 09:12:58'),
(45, '33', '2026-05-18', 3, 23, '2026-05-18 07:09:37', '2026-05-18 07:09:37'),
(46, '44', '2026-05-18', 1, 23, '2026-05-18 07:10:43', '2026-05-18 07:10:43'),
(47, '43', '2026-05-18', 1, 23, '2026-05-18 07:10:54', '2026-05-18 07:10:54'),
(48, '42', '2026-05-18', 3, 23, '2026-05-19 03:35:53', '2026-05-19 03:35:53'),
(49, '45', '2026-05-20', 3, 23, '2026-05-21 11:42:24', '2026-05-21 11:42:24'),
(50, '45', '2026-05-19', 1, 23, '2026-05-21 11:42:49', '2026-05-21 11:42:49'),
(51, '31', '2026-05-19', 2, 23, '2026-05-22 03:47:25', '2026-05-22 03:47:25'),
(52, '46', '2026-05-19', 3, 23, '2026-05-22 03:48:13', '2026-05-22 03:48:13'),
(53, '47', '2026-05-19', 2, 23, '2026-05-22 03:48:55', '2026-05-22 03:48:55'),
(54, '50', '2026-05-22', 1, 23, '2026-05-22 03:52:09', '2026-05-22 03:52:09'),
(55, '45', '2026-05-21', 4, 23, '2026-05-22 03:53:00', '2026-05-22 03:53:00'),
(56, '46', '2026-05-21', 2, 23, '2026-05-22 03:53:13', '2026-05-22 03:53:13'),
(57, '48', '2026-05-21', 2, 23, '2026-05-22 03:53:23', '2026-05-22 03:53:23'),
(58, '49', '2026-05-22', 2, 23, '2026-05-22 03:53:50', '2026-05-22 03:53:50'),
(59, '49', '2026-08-06', 3, 23, '2026-08-06 11:29:09', '2026-08-06 11:29:09');

-- --------------------------------------------------------

--
-- Table structure for table `todos`
--

CREATE TABLE `todos` (
  `id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `priority` enum('Low','Medium','High') DEFAULT 'Medium',
  `due_date` date DEFAULT NULL,
  `completed` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_id` int NOT NULL
) ;

--
-- Dumping data for table `todos`
--

INSERT INTO `todos` (`id`, `title`, `description`, `priority`, `due_date`, `completed`, `created_at`, `updated_at`, `user_id`) VALUES
(1, 'Test', 'Test How are yous', 'Medium', '2026-05-08', 1, '2026-05-01 15:58:56', '2026-05-02 09:19:14', 1);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `plain_password` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `role` enum('employee','admin') COLLATE utf8mb4_general_ci DEFAULT 'employee',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `plain_password`, `role`, `created_at`) VALUES
(1, 'test', 'ssrajkiran1@gmail.com', '$2b$10$Cfwh/GCioz7CV0toyCl4QeGOPLnjHHJLE5fi4VmOj0fxgiVR0yvEC', '1234', 'employee', '2026-02-14 07:34:10'),
(4, 'Admin', 'ssrajkiran01@gmail.com', '$2b$10$sKKUbA.WVJZwOaakdk6AheE8BNmZ69ipfFQdrAC0PePjR6djDcELe', '123456', 'employee', '2026-02-14 07:34:10'),
(14, 'GIRIJA', 'girija.r@voltechgroup.com', '$2b$10$K85QcA0Y9/Ah04jFaS1Kse8MwM1h4DXUVcs.pwPPgNluZf1lHOAVG', 'girija.r', 'employee', '2026-04-30 04:13:01'),
(15, 'ELANGOVAN', 'elangovan.d@voltechgroup.com', '$2b$10$0S1FExFb8mruI63OvIEKp.l4uzLI3JJaiiEFUx3w4ZWRtPng1jpmq', 'elangovan.d', 'employee', '2026-04-30 04:14:44'),
(16, 'Govardhan', 'govardhan.k@voltechgroup.com', '$2b$10$086/ze6dmy6JucbWYcbWae5dzYPd9CapBLWDUO6cDuXpWvuHAeJha', 'gopi@123', 'employee', '2026-04-30 04:20:38'),
(23, 'RAJKIRAN S S', 'rajkiran.s@voltechgroup.com', '$2b$10$aWV6mB9TZbmDhwoPGvJJue3gIs/sAPU80ZK6MjZgg/oOFRwaSPBZO', '123456', 'employee', '2026-05-01 14:49:11'),
(26, 'Santhoshkumar', 'santhosh.srdesigner@gmail.com', '$2b$10$2obbYFzG5jaT7TMBsk7gMeNUZF2nIF9Jzy3ULcaPyPyf8fbK1HoAy', 'VG@12345', 'admin', '2026-05-06 05:04:05'),
(27, 'Vimal SR', 'voltecherp@gmail.com', '$2b$10$hgVVQtE.4PctlDTksbfHFOOe.z7HoRodYTIZfO0yeDimx/cvoNUny', 'Vimal@S182', 'employee', '2026-05-13 03:17:49');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ai_reports`
--
ALTER TABLE `ai_reports`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `holidays`
--
ALTER TABLE `holidays`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `leaves`
--
ALTER TABLE `leaves`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `permission`
--
ALTER TABLE `permission`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `present_on_holiday`
--
ALTER TABLE `present_on_holiday`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `task`
--
ALTER TABLE `task`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `timesheet`
--
ALTER TABLE `timesheet`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `todos`
--
ALTER TABLE `todos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_todos_user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ai_reports`
--
ALTER TABLE `ai_reports`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `holidays`
--
ALTER TABLE `holidays`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `leaves`
--
ALTER TABLE `leaves`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `permission`
--
ALTER TABLE `permission`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `present_on_holiday`
--
ALTER TABLE `present_on_holiday`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `task`
--
ALTER TABLE `task`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT for table `timesheet`
--
ALTER TABLE `timesheet`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;

--
-- AUTO_INCREMENT for table `todos`
--
ALTER TABLE `todos`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `leaves`
--
ALTER TABLE `leaves`
  ADD CONSTRAINT `leaves_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `present_on_holiday`
--
ALTER TABLE `present_on_holiday`
  ADD CONSTRAINT `present_on_holiday_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `todos`
--
ALTER TABLE `todos`
  ADD CONSTRAINT `todos_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
