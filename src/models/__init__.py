from database import SessionLocal, BaseModel

# Model imports
from models.project_model import Project
from models.language_model import SupportedLanguage, ProjectLanguage
from models.category_model import SupportedCategory
from models.user_model import Invitation
from models.organisation_model import Organisation
from models.timestamps_model import TimestampMixin, SoftDeleteMixin


# # Then in your models
# class MyModel(Base, TimestampMixin):
#     # Your model fields here


# # Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
