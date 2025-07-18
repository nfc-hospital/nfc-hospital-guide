        return Response({ 
            'success': True, 
            'data': data or {}, 
            'message': message, 
            'timestamp': timezone.now().isoformat() 
        }) 
