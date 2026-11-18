-- Una base por microservicio (nada de joins entre bases). El usuario livesmanage lo crea la imagen de MySQL (MYSQL_USER).
CREATE DATABASE IF NOT EXISTS livesmanage_auth;
CREATE DATABASE IF NOT EXISTS livesmanage_lives;
CREATE DATABASE IF NOT EXISTS livesmanage_clientas;
GRANT ALL PRIVILEGES ON livesmanage_auth.* TO 'livesmanage'@'%';
GRANT ALL PRIVILEGES ON livesmanage_lives.* TO 'livesmanage'@'%';
GRANT ALL PRIVILEGES ON livesmanage_clientas.* TO 'livesmanage'@'%';
