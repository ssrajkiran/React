-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 08, 2026 at 04:33 PM
-- Server version: 10.4.27-MariaDB
-- PHP Version: 8.2.0

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
-- Table structure for table `leaves`
--

CREATE TABLE `leaves` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `from_date` date DEFAULT NULL,
  `to_date` date DEFAULT NULL,
  `days` decimal(12,2) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `type` enum('leave','compoff') DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `comp_off_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `leaves`
--

INSERT INTO `leaves` (`id`, `user_id`, `from_date`, `to_date`, `days`, `remarks`, `type`, `status`, `created_at`, `comp_off_date`) VALUES
(1, 1, '2026-02-06', '2026-02-08', '2.00', 'test', 'leave', 'approved', '2026-02-08 14:30:47', NULL),
(2, 1, '2026-02-06', '2026-02-07', '1.00', 'test', 'leave', 'rejected', '2026-02-08 14:48:17', NULL),
(3, 1, '2026-02-06', '2026-02-07', '0.50', 'test', 'leave', 'pending', '2026-02-08 14:55:11', NULL),
(4, 1, '2026-02-07', '2026-02-07', '0.50', 'test', 'leave', 'pending', '2026-02-08 14:57:12', NULL),
(5, 1, '2026-02-07', '2026-02-07', '1.00', 'test', 'compoff', 'pending', '2026-02-08 15:01:19', '2026-02-01'),
(6, 1, '2026-02-14', '2026-02-14', '1.00', 'test', 'compoff', 'pending', '2026-02-08 15:04:07', NULL),
(7, 1, '2026-02-21', '2026-02-21', '1.00', 'te', 'compoff', 'pending', '2026-02-08 15:04:36', NULL),
(8, 1, '2026-02-05', '2026-02-05', '1.00', 'test', 'compoff', 'pending', '2026-02-08 15:07:50', NULL),
(9, 1, '2026-02-04', '2026-02-04', '1.00', 'test', 'compoff', 'pending', '2026-02-08 15:09:41', '2026-02-01'),
(10, 1, '2026-02-06', '2026-02-06', '0.50', 'test', 'leave', 'pending', '2026-02-08 15:26:45', NULL),
(11, 1, '2026-02-02', '2026-02-04', '3.00', 'test', 'leave', 'pending', '2026-02-08 15:27:01', NULL),
(12, 1, '2026-02-09', '2026-02-09', '1.00', 'test', 'compoff', 'pending', '2026-02-08 15:29:17', '2026-02-07'),
(13, 1, '2026-02-07', '2026-02-07', '0.50', 'test', 'leave', 'pending', '2026-02-08 15:29:31', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('employee','admin') DEFAULT 'employee'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`) VALUES
(1, 'test', 'ssrajkiran1@gmail.com', '$2b$10$6AmxlTWjCy72Tb2n82Bli.FT3/skGPcSkHcHB..DhAIvjBsPBgF3C', 'employee'),
(4, 'test', 'ssrajkiran01@gmail.com', '$2b$10$5OlcIgfPjBwZe7yNvLPiTuMZqwvK9dKhhb5Cp4h8d9gL0Pchx.hWa', 'admin');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `leaves`
--
ALTER TABLE `leaves`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

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
-- AUTO_INCREMENT for table `leaves`
--
ALTER TABLE `leaves`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `leaves`
--
ALTER TABLE `leaves`
  ADD CONSTRAINT `leaves_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
