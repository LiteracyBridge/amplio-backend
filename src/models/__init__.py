from database import BaseModel, SessionLocal, get_db
from models.category_model import SupportedCategory

# Model imports
from models.language_model import Language as SupportedLanguage
from models.language_model import ProjectLanguage
from models.organisation_model import Organisation
from models.program_model import DeploymentInterval, Program, Project
from models.role_model import Role
from models.timestamps_model import SoftDeleteMixin, TimestampMixin
from models.user_model import Invitation, User, UserRole, current_user

# # Dependency
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()
