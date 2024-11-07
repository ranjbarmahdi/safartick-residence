create database safartick;

CREATE TABLE residence (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50)  NOT NULL,
    url TEXT UNIQUE NOT NULL,
    name VARCHAR(255), 
    city VARCHAR(100), 
    province VARCHAR(100), 
    description TEXT, 
    facilities TEXT,
    capacity INT, 
    room_count INT, 
    amenities TEXT, 
    rules TEXT,
    host_name VARCHAR(255), 
    contact_number VARCHAR(20)
);

CREATE TABLE price (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    date TEXT,
    price DECIMAL(10, 2) NOT NULL,
    is_instant BOOLEAN DEFAULT FALSE
);


CREATE TABLE comment (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    username VARCHAR(100) NOT NULL,
    comment_date DATE NOT NULL,
    comment_text TEXT,
    rating INT
);


CREATE TABLE public.problem (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE
);

CREATE TABLE public.unvisited (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE
);

CREATE TABLE public.visited (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE
);
