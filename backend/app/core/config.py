from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://frog:frog@localhost:5432/frogdb"

    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "frog-photos"
    MINIO_PUBLIC_URL: str = "http://localhost:9000"

    CORS_ORIGINS: str = "http://localhost:5173"
    ROOT_PATH: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
