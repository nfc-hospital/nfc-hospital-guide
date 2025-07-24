import hashlib
import secrets
from django.contrib.auth.hashers import BasePasswordHasher
from django.utils.encoding import force_bytes

class ScryptPasswordHasher(BasePasswordHasher):
    """
    Django의 PASSWORD_HASHERS에 사용할 Scrypt 해셔
    """
    algorithm = "scrypt"

    # 모델에서 사용했던 Scrypt 파라미터와 동일하게 설정
    iterations = 16384  # N
    memory_cost = 8     # r
    parallelism = 1     # p
    dklen = 64          # dklen (Derived Key Length)

    def encode(self, password, salt):
        """
        주어진 비밀번호와 salt를 사용하여 해시를 생성합니다.
        """
        assert salt and '$' not in salt
        password = force_bytes(password)
        salt_bytes_value = force_bytes(salt)

        pw_hash = hashlib.scrypt(
            password,
            salt=salt_bytes_value,
            n=self.iterations,
            r=self.memory_cost,
            p=self.parallelism,
            dklen=self.dklen
        )
        # Django의 password 필드는 "알고리즘$SALT$해시값" 형식으로 저장
        # 이 형식에 맞게 문자열을 반환
        # salt.hex()는 64자, pw_hash.hex()는 128자
        # 총 길이는 "scrypt$" + 64 + "$" + 128 = 8 + 64 + 1 + 128 = 201자
        # 이 길이는 AbstractBaseUser의 기본 password 필드(max_length=128)보다 길기 때문에,
        # Django 3.2 이상에서는 자동으로 TEXT 타입으로 변경되거나,
        # MySQL 컬럼의 길이를 충분히 확보해야 함
        # 하지만 대부분의 경우 Django가 알아서 처리
        return "%s$%s$%s" % (self.algorithm, salt_bytes_value.hex(), pw_hash.hex())

    def verify(self, password, encoded):
        """
        인코딩된 비밀번호와 일반 비밀번호를 비교합니다.
        """
        algorithm, salt_hex, hash_hex = encoded.split('$', 2)
        assert algorithm == self.algorithm
        salt = bytes.fromhex(salt_hex)

        pw_hash = hashlib.scrypt(
            force_bytes(password),
            salt=salt,
            n=self.iterations,
            r=self.memory_cost,
            p=self.parallelism,
            dklen=self.dklen
        )
        return secrets.compare_digest(pw_hash.hex(), hash_hex)

    def safe_summary(self, encoded):
        """
        로그 등에서 비밀번호 해시가 노출되지 않도록 안전한 요약 정보를 제공합니다.
        """
        return {
            'algorithm': self.algorithm,
            'salt': self.decode(encoded)['salt'],
        }