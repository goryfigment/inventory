# import the User object
from inventory.models import User
import bcrypt


def validate_password(password, hashed_password):
    return bcrypt.hashpw(password.encode('utf8'), hashed_password.encode('utf8')) == hashed_password

# Name my backend 'MyCustomBackend'
class MyCustomBackend:
    # Create an authentication method
    # This is called by the standard Django login procedure
    def authenticate(self, email=None, username=None, password=None):
        try:
            # Try to find a user matching your username
            if username:
                user = User.objects.get(username=username)
            else:
                user = User.objects.get(email=email)
            #  Compare original string of password to hashed password stored in the database
            if validate_password(password, user.password):
                # Yes? return the Django user object
                return user
            else:
                # No? return None - triggers default login failed
                return None
        except User.DoesNotExist:
            # No user was found, return None - triggers default login failed
            return None

    # Required for your backend to work properly - unchanged in most scenarios
    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None