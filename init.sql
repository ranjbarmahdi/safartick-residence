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
    capacity TEXT, 
    room_count TEXT, 
    amenities TEXT, 
    rules TEXT,
    host_name VARCHAR(255), 
    contact_number VARCHAR(20),
    average_rating TEXT
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
    username VARCHAR(100),
    comment_text TEXT,
    comment_date TEXT ,
    rating TEXT
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
